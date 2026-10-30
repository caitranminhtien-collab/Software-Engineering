import request from "supertest";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/config/database",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/config/database"
        )
      >();

    return {
      ...actual,

      checkDatabaseConnection:
        vi.fn(),
    };
  }
);

vi.mock(
  "../../src/config/redis",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/config/redis"
        )
      >();

    return {
      ...actual,

      checkRedisConnection:
        vi.fn(),
    };
  }
);

import app from "../../src/app";

import {
  checkDatabaseConnection,
} from "../../src/config/database";

import {
  checkRedisConnection,
} from "../../src/config/redis";

describe(
  "GET /api/v1/health/ready",
  () => {
    beforeEach(() => {
      vi.mocked(
        checkDatabaseConnection
      ).mockReset();

      vi.mocked(
        checkRedisConnection
      ).mockReset();

      vi.spyOn(
        console,
        "error"
      ).mockImplementation(
        () => undefined
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it(
      "returns 200 when database and Redis are ready",
      async () => {
        vi.mocked(
          checkDatabaseConnection
        ).mockResolvedValue(
          undefined
        );

        vi.mocked(
          checkRedisConnection
        ).mockResolvedValue(
          undefined
        );

        const response =
          await request(app)
            .get(
              "/api/v1/health/ready"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body
        ).toEqual({
          status: "ready",
          database: "connected",
          redis: "connected",
        });
      }
    );

    it(
      "returns 503 when database is unavailable",
      async () => {
        vi.mocked(
          checkDatabaseConnection
        ).mockRejectedValue(
          new Error(
            "Database unavailable"
          )
        );

        vi.mocked(
          checkRedisConnection
        ).mockResolvedValue(
          undefined
        );

        const response =
          await request(app)
            .get(
              "/api/v1/health/ready"
            );

        expect(
          response.status
        ).toBe(503);

        expect(
          response.body
        ).toEqual({
          status: "not_ready",
          database: "unavailable",
          redis: "connected",
        });
      }
    );

        it(
      "returns 503 when Redis is unavailable",
      async () => {
        vi.mocked(
          checkDatabaseConnection
        ).mockResolvedValue(undefined);

        vi.mocked(
          checkRedisConnection
        ).mockRejectedValue(
          new Error("Redis unavailable")
        );

        const response = await request(app)
          .get("/api/v1/health/ready")
          .expect(503);

        expect(response.body).toEqual({
          status: "not_ready",
          database: "connected",
          redis: "unavailable",
        });
      }
    );

    it(
      "keeps liveness available when both dependencies fail",
      async () => {
        vi.mocked(
          checkDatabaseConnection
        ).mockRejectedValue(
          new Error("Database unavailable")
        );

        vi.mocked(
          checkRedisConnection
        ).mockRejectedValue(
          new Error("Redis unavailable")
        );

        await request(app)
          .get("/api/v1/health/live")
          .expect(200);

        const response = await request(app)
          .get("/api/v1/health/ready")
          .expect(503);

        expect(response.body).toEqual({
          status: "not_ready",
          database: "unavailable",
          redis: "unavailable",
        });
      }
    );
  }
);