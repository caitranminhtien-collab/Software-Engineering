#!/usr/bin/env bash
set -euo pipefail

stage="verify opt-in and target"
trap 'printf "BE10 bootstrap FAIL: %s\n" "$stage" >&2' ERR

refuse() {
    printf 'BE10 bootstrap REFUSED: target must be a new empty BE10 database.\n' >&2
    exit 1
}

# This script has no opt-in for DEV, restored databases or existing staging.
[[ "${BE10_RUN_ID:-}" =~ ^[a-f0-9]{32}$ ]] || refuse
[[ "${BE10_PROJECT_NAME:-}" == "hue-be10-${BE10_RUN_ID}" ]] || refuse
[[ "${BE10_BOOTSTRAP_CONFIRM:-}" == "new-empty-${BE10_RUN_ID}" ]] || refuse
[[ "${PGDATABASE:-}" == "hue_be10_test_${BE10_RUN_ID}" ]] || refuse
[[ "${PGHOST:-}" == "postgres" ]] || refuse
[[ "${PGPORT:-}" == "5432" ]] || refuse
[[ "${PGUSER:-}" == "postgres" ]] || refuse
[[ ${#BE04_APP_PASSWORD} -ge 16 ]] || refuse
[[ "$BE04_APP_PASSWORD" != *$'\n'* ]] || refuse
[[ "$BE04_APP_PASSWORD" != *$'\r'* ]] || refuse

query() {
    psql -X -q -A -t -v ON_ERROR_STOP=1 "$@" 2>/dev/null
}

verify_identity() {
    local actual
    actual=$(query -c 'SELECT current_database() || chr(124) || current_user;')
    [[ "$actual" == "${PGDATABASE}|postgres" ]] || refuse
}

verify_identity
tables=$(query -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema');")
roles=$(query -c "SELECT COUNT(*) FROM pg_roles WHERE rolname = 'hue_app';")
databases=$(query -v target_db="$PGDATABASE" <<'SQL'
SELECT COUNT(*) FROM pg_database
WHERE NOT datistemplate AND datname NOT IN ('postgres', :'target_db');
SQL
)
[[ "$tables" == "0" ]] || refuse
[[ "$roles" == "0" ]] || refuse
[[ "$databases" == "0" ]] || refuse
printf 'BE10 bootstrap OK: verified isolated empty database.\n'

stage="create restricted role"
verify_identity
query -c 'CREATE ROLE hue_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;' >/dev/null

stage="set role credential through psql password prompt"
verify_identity
# psql hashes the password client-side. No plaintext password is interpolated
# into SQL, a command argument, a file, shell tracing, or logged output.
printf '%s\n%s\n' "$BE04_APP_PASSWORD" "$BE04_APP_PASSWORD" |
    psql -X -q -v ON_ERROR_STOP=1 -c '\password hue_app' >/dev/null 2>&1
unset BE04_APP_PASSWORD

migrations=(
    /migrations/core/001_core_schema.sql
    /migrations/M25.sql
    /migrations/M26.sql
    /migrations/core/20261026_visitor_presence_last_seen.sql
    /migrations/core/007_add_performance_indexes.sql
    /migrations/core/008_allow_relative_media_url.sql
)

for migration in "${migrations[@]}"; do
    stage="migration ${migration}"
    printf 'BE10 bootstrap START: %s\n' "$stage"
    verify_identity
    # Strip only a leading UTF-8 BOM in the stream; never rewrite source SQL.
    sed '1s/^\xEF\xBB\xBF//' "$migration" |
        query -f - >/dev/null
    printf 'BE10 bootstrap OK: %s\n' "$stage"
done

stage="grant runtime DML privileges"
verify_identity
query -v target_db="$PGDATABASE" >/dev/null <<'SQL'
REVOKE ALL ON DATABASE :"target_db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"target_db" TO hue_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hue_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hue_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hue_app;
SQL
printf 'BE10 bootstrap OK: restricted runtime role and schema prepared.\n'
