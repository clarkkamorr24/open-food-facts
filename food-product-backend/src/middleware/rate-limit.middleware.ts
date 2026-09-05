import rateLimit from "express-rate-limit";

import { env } from "../config/env";

const skipInTests = () => env.NODE_ENV === "test";

export const searchRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please slow down and try again shortly.",
    },
  },
});

export const checkoutRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many checkout attempts. Please try again shortly.",
    },
  },
});
