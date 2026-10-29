require("dotenv/config");

const assert = require("node:assert/strict");

const {
  db,
} = require("../dist/config/database");

const {
  findDailyVisitorEvents,
  findTtsLanguages,
  findAttractionViewRanking,
} = require("../dist/repositories/staff-analytics.repository");

async function main() {
  let client;

  try {
    if (
      process.env.DB_HOST !== "127.0.0.1" ||
      process.env.DB_PORT !== "5433" ||
      process.env.DB_NAME !== "hue_tourism"
    ) {
      throw new Error("Run only against the local DEV database");
    }

    client = await db.connect();

    // Repository dùng cùng kết nối chứa bảng tạm.
    db.query = client.query.bind(client);

    await client.query("BEGIN");

    await client.query(`
      CREATE TEMP TABLE visitor_events (
        event_id bigint,
        event_type text,
        attraction_id bigint,
        language_code text,
        created_at timestamptz
      ) ON COMMIT DROP;

      CREATE TEMP TABLE attractions (
        attraction_id bigint,
        slug text,
        status text
      ) ON COMMIT DROP;

      CREATE TEMP TABLE attraction_localizations (
        attraction_id bigint,
        language_code text,
        status text,
        name text
      ) ON COMMIT DROP;

      INSERT INTO attractions VALUES
        (1, 'be01-test', 'published'),
        (2, 'be01-zero', 'published');

      INSERT INTO attraction_localizations VALUES
        (1, 'vi', 'published', 'BE01 Test'),
        (2, 'vi', 'published', 'BE01 Zero');

      INSERT INTO visitor_events
      SELECT
        ROW_NUMBER() OVER (),
        t.event_type,
        CASE
          WHEN t.event_type <> 'route_started' THEN 1
        END,
        CASE
          WHEN t.event_type = 'tts_started' THEN
            CASE
              WHEN d.day_offset IN (0, -7, -30, 1)
                THEN 'vi'
              ELSE 'en'
            END
        END,
        (
          (
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            + d.day_offset
          ) + TIME '00:00:00'
        ) AT TIME ZONE 'Asia/Ho_Chi_Minh'
      FROM unnest(ARRAY[0, -6, -7, -29, -30, 1])
        AS d(day_offset)
      CROSS JOIN unnest(ARRAY[
        'attraction_view',
        'tts_started',
        'route_started'
      ]) AS t(event_type);
    `);

    for (const days of [7, 30]) {
      const expectedTotal = days === 7 ? 2 : 4;
      const expectedLanguageTotal = expectedTotal / 2;

      const daily = await findDailyVisitorEvents(days);
      const languages = await findTtsLanguages(days);
      const ranking = await findAttractionViewRanking(days);

      assert.equal(daily.length, days);

      for (const field of [
        "attraction_views",
        "tts_starts",
        "route_starts",
      ]) {
        const total = daily.reduce(
          (sum, row) => sum + Number(row[field]),
          0
        );

        assert.equal(total, expectedTotal, `${days} days: ${field}`);
      }

      const languageCounts = Object.fromEntries(
        languages.map((row) => [
          row.language_code,
          Number(row.total),
        ])
      );

      assert.deepEqual(languageCounts, {
        en: expectedLanguageTotal,
        vi: expectedLanguageTotal,
      });

      assert.deepEqual(
        ranking.map((row) => ({
          id: Number(row.attraction_id),
          total: Number(row.total),
        })),
        [
          { id: 1, total: expectedTotal },
          { id: 2, total: 0 },
        ]
      );

      console.log(`PASS: ${days}-day analytics`);
    }
  } finally {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    }

    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});