"use strict";

const descriptions = {
  "23502": "not_null_violation",
  "23503": "foreign_key_violation",
  "23505": "unique_violation",
  "23514": "check_violation",
  "25P02": "in_failed_sql_transaction",
  "42704": "undefined_object",
  "42P01": "undefined_table",
  "42501": "insufficient_privilege",
  "42601": "syntax_error",
  "57014": "query_canceled",
};

function safeDiagnostics(error) {
  const result = {};
  if (/^[0-9A-Z]{5}$/.test(error?.code || "")) {
    result.sqlstate = error.code;
    result.category = descriptions[error.code] || "postgresql_error";
  }
  const systemCodes = [
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOENT",
    "ABORT_ERR",
  ];
  if (systemCodes.includes(error?.code)) {
    result.systemCode = error.code;
  }
  const connectionFailures = [
    "Connection terminated unexpectedly",
    "timeout expired",
  ];
  if (connectionFailures.includes(error?.message)) {
    result.connectionFailure = error.message;
  }
  if (/^[0-9]{1,9}$/.test(error?.position || "")) {
    result.position = Number(error.position);
  }
  if (error?.schema === "public") {
    result.schema = "public";
  }
  // Exact matches only. Never print an arbitrary message, detail, SQL or value.
  for (const role of ["hue_app", "be08_runner"]) {
    if (
      error?.code === "42704" &&
      error.message === `role "${role}" does not exist`
    ) {
      result.missingRole = role;
    }
  }
  if (Number.isInteger(error?.exitStatus)) {
    result.exitStatus = error.exitStatus;
  }
  return result;
}

module.exports = { safeDiagnostics };
