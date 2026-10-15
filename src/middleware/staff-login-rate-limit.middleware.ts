import {
  rateLimit,
} from "express-rate-limit";

export const staffLoginRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders: true,
    legacyHeaders: false,

    /*
     * Login thành công không tính vào
     * giới hạn failed attempts.
     */
    skipSuccessfulRequests: true,

    message: {
      error: {
        code:
          "TOO_MANY_LOGIN_ATTEMPTS",

        message:
          "Too many login attempts. Please try again later.",
      },
    },
  });