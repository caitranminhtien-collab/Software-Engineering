import session from "express-session";
import { RedisStore } from "connect-redis";

import {
  redisClient,
} from "./redis";

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "hue:staff:",
});

export const staffSessionMiddleware =
  session({
    name: "hue_staff_session",

    store: redisStore,

    secret:
      process.env.SESSION_SECRET ||
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