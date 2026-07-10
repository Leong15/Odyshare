import { Request, Response, NextFunction } from "express";
import { createSlidingRateLimiter } from "../utils/rateLimiter.js";
import { AI_RATE_LIMIT_WINDOW_MS, AI_RATE_LIMIT_MAX_ATTEMPTS } from "../utils/constants.js";
import { fail } from "../utils/apiResponse.js";

// Shared rate limiter instance for AI endpoints
const aiRateLimiterInstance = createSlidingRateLimiter({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  maxAttempts: AI_RATE_LIMIT_MAX_ATTEMPTS,
});

export function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId || req.ip || "anonymous";

  const ok = aiRateLimiterInstance.check(userId);
  if (!ok) {
    return res.status(429).json(
      fail(
        "TOO_MANY_REQUESTS",
        "AI 呼叫頻率過高，請稍後再試 (AI rate limit exceeded. Please try again later)."
      )
    );
  }

  next();
}
