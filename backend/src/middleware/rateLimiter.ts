import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipHits = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter to protect backend endpoints.
 * @param windowMs Time window in milliseconds
 * @param maxHits Maximum number of allowed requests in the window
 */
export function rateLimiter(windowMs = 60000, maxHits = 100) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipHits.get(ip);
    if (!record || now > record.resetAt) {
      ipHits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > maxHits) {
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
        retryAfterMs: record.resetAt - now,
      });
      return;
    }

    next();
  };
}
