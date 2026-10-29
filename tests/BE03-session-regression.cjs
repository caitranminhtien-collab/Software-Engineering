const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

if (
  process.env.NODE_ENV !== "test" ||
  process.env.DB_HOST !== "127.0.0.1" ||
  process.env.DB_NAME !== "hue_tourism_test"
) {
  throw new Error("Dedicated test environment required");
}

// Các test này không được gọi API AI qua fetch.
globalThis.fetch = async () => {
  throw new Error("External fetch is disabled in this test");
};

const express = require("express");
const request = require("supertest");
const bcrypt = require("bcrypt");

const { db } = require("../dist/config/database");

const {
  redisClient,
  connectRedis,
} = require("../dist/config/redis");

const {
  staffSessionMiddleware,
} = require("../dist/config/session");

const {
  requireStaffSession,
} = require("../dist/middleware/staff-auth.middleware");

const {
  createStaffAccountService,
} = require("../dist/services/staff-account.service");

async function main() {
  let client;
  let sessionKey;

try {
    console.log("STEP 1: connecting PostgreSQL");
    client = await db.connect();
    console.log("STEP 2: PostgreSQL connected");

    const database = await client.query(
      "SELECT current_database() AS name"
    );

    assert.equal(
      database.rows[0].name,
      "hue_tourism_test"
    );

    console.log("STEP 3: starting transaction");
    await client.query("BEGIN");
    console.log("STEP 4: transaction started");

    // Cho service dùng cùng transaction để rollback cuối test.
    db.query = client.query.bind(client);

    console.log("STEP 5: connecting Redis");
    await connectRedis();
    console.log("STEP 6: Redis connected");

    assert.equal(await redisClient.ping(), "PONG");
    console.log("STEP 7: Redis PING passed");

    const password = `Test-${randomUUID()}`;

    const account = await createStaffAccountService({
      email: `be03-${randomUUID()}@example.com`,
      password,
      fullName: "BE03 Session Test",
      role: "admin",
      isActive: true,
    });

    const stored = await client.query(
      `SELECT password_hash
       FROM public.staff_accounts
       WHERE staff_id = $1`,
      [account.id]
    );

    const passwordHash = stored.rows[0].password_hash;

    assert.notEqual(passwordHash, password);
    assert.equal(
      await bcrypt.compare(password, passwordHash),
      true
    );

    console.log("PASS: account persisted with bcrypt hash");

    function createTestApp() {
      const app = express();

      app.use(staffSessionMiddleware);

      // Route chỉ có trong test, không thêm vào ứng dụng thật.
      app.post("/test/session", (req, res) => {
        req.session.staffId = account.id;

        res.json({
          sessionId: req.sessionID,
        });
      });

      app.get(
        "/test/protected",
        requireStaffSession,
        (_req, res) => {
          res.json({ data: res.locals.staff });
        }
      );

      app.post("/test/logout", (req, res, next) => {
        req.session.destroy((error) => {
          if (error) {
            next(error);
            return;
          }

          res.sendStatus(204);
        });
      });

      return app;
    }

    const firstApp = createTestApp();

    await request(firstApp)
      .get("/test/protected")
      .expect(401);

    const firstAgent = request.agent(firstApp);

    const created = await firstAgent
      .post("/test/session")
      .expect(200);

    sessionKey =
      `hue:staff:${created.body.sessionId}`;

    const sessionValue = await redisClient.get(sessionKey);

    assert.ok(sessionValue);
    assert.equal(
      JSON.parse(sessionValue).staffId,
      account.id
    );

    const ttl = await redisClient.ttl(sessionKey);
    assert.ok(ttl > 0 && ttl <= 8 * 60 * 60);

    console.log("PASS: session stored in Redis with expiry");

    // App thứ hai đọc lại cookie bằng RedisStore.
    const secondApp = createTestApp();

    const cookie = created.headers["set-cookie"]
      .map((value) => value.split(";")[0])
      .join("; ");

    const restored = await request(secondApp)
      .get("/test/protected")
      .set("Cookie", cookie)
      .expect(200);

    assert.equal(restored.body.data.id, account.id);

    console.log("PASS: second app restores authenticated session");

    await request(secondApp)
      .post("/test/logout")
      .set("Cookie", cookie)
      .expect(204);

    assert.equal(
      await redisClient.get(sessionKey),
      null
    );

    await request(secondApp)
      .get("/test/protected")
      .set("Cookie", cookie)
      .expect(401);

    console.log("PASS: logout removes session and blocks old cookie");
  } finally {
    try {
      if (sessionKey && redisClient.isReady) {
        await redisClient.del(sessionKey);
      }
    } finally {
      try {
        if (client) {
          try {
            await client.query("ROLLBACK");
          } finally {
            client.release();
          }
        }
      } finally {
        try {
          if (redisClient.isOpen) {
            await redisClient.quit();
          }
        } finally {
          await db.end();
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});