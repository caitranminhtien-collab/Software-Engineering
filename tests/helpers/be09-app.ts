/// <reference path="../../src/types/express-session.d.ts" />
import express from "express";
import session from "express-session";
import {
  expect,
  vi,
} from "vitest";

const stores: session.MemoryStore[] = [];
const databaseQueries: ReturnType<typeof vi.fn>[] = [];

export async function createBe09App(production = false) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", production ? "production" : "test");
  vi.stubEnv("SESSION_SECRET", "be09-synthetic-session-secret-at-least-32");

  const databaseQuery = vi.fn(() => {
    throw new Error("BE09 forbids database access");
  });
  databaseQueries.push(databaseQuery);
  vi.doMock("../../src/config/database", () => {
    return {
      db: {
        query: databaseQuery,
      },
    };
  });
  vi.doMock("../../src/config/redis", () => {
    return {
      redisClient: {},
    };
  });
  vi.doMock("connect-redis", () => {
    return {
      RedisStore: class extends session.MemoryStore {
        constructor() {
          super();
          stores.push(this);
        }
      },
    };
  });

  // Only the Redis transport is replaced. Cookie/session options come from src.
  const { staffSessionMiddleware } = await import("../../src/config/session");
  const auth = await import("../../src/services/staff-auth.service");
  const staff = {
    id: 1,
    email: "be09@example.invalid",
    full_name: "BE09 Staff",
    role: "admin" as const,
  };
  const authenticate = vi.spyOn(auth, "authenticateStaff")
    .mockResolvedValue(staff);
  const activeStaff = vi.spyOn(auth, "getActiveStaffById")
    .mockResolvedValue(staff);
  const { default: authRoutes } = await import("../../src/routes/staff-auth.routes");

  const app = express();
  app.use(express.json());
  // This is a test-only proxy for simulating HTTPS, not a production proxy test.
  app.set("trust proxy", 1);
  app.use(staffSessionMiddleware);
  app.get("/test/unmodified", (_req, res) => {
    res.sendStatus(204);
  });
  app.post("/test/session", (req, res) => {
    req.session.staffId = staff.id;
    res.status(200).json({ sessionId: req.sessionID });
  });
  app.use("/api/v1/staff/auth", authRoutes);

  return {
    app,
    auth,
    staff,
    authenticate,
    activeStaff,
    store: stores[stores.length - 1],
  };
}

export async function cleanupBe09() {
  try {
    for (const store of stores) {
      await new Promise<void>((resolve, reject) => {
        store.clear((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    for (const query of databaseQueries) {
      expect(query).not.toHaveBeenCalled();
    }
  } finally {
    stores.length = 0;
    databaseQueries.length = 0;
    if (vi.isFakeTimers()) {
      vi.clearAllTimers();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.doUnmock("../../src/config/database");
    vi.doUnmock("../../src/config/redis");
    vi.doUnmock("connect-redis");
    vi.resetModules();
  }
}
