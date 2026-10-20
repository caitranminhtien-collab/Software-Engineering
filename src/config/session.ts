import session from "express-session";
import { RedisStore } from "connect-redis";

import {
  redisClient,
} from "./redis";

const sessionSecret =
  process.env.SESSION_SECRET;

if (
  process.env.NODE_ENV === "production" &&
  (!sessionSecret || sessionSecret.length < 32)
) {
  throw new Error(
    "SESSION_SECRET must contain at least 32 characters in production"
  );
}

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "hue:staff:",
});

export const staffSessionMiddleware =
  session({
    name: "hue_staff_session",

    store: redisStore,

    secret:
      sessionSecret ||
      "dev-only-change-this-secret",

    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",

      secure:
        process.env.NODE_ENV ===
        "production",

      maxAge:
        8 * 60 * 60 * 1000,
    },
  });