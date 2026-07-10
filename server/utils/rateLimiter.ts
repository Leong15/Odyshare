export interface RateLimiterOptions {
  windowMs: number;
  maxAttempts: number;
}

export function createSlidingRateLimiter(options: RateLimiterOptions) {
  const attempts = new Map<string, { count: number; firstAttempt: number }>();

  return {
    check(key: string): boolean {
      const now = Date.now();

      // Proactive cleanup of expired entries to prevent memory leak
      for (const [k, val] of attempts.entries()) {
        if (now - val.firstAttempt > options.windowMs) {
          attempts.delete(k);
        }
      }

      const attempt = attempts.get(key);
      if (!attempt) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return true;
      }

      if (now - attempt.firstAttempt > options.windowMs) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return true;
      }

      attempt.count++;
      if (attempt.count > options.maxAttempts) {
        return false; // Blocked
      }
      return true;
    },
    reset(key: string): void {
      attempts.delete(key);
    }
  };
}
