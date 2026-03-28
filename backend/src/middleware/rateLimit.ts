import type { Request, Response, NextFunction } from 'express';
import { redisGet, redisSet } from '../lib/redis.js';

export function createRateLimit(windowMs: number, maxRequests: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId as string;
    if (!userId) return next();

    const now = Date.now();
    const entry = hits.get(userId);

    if (!entry || now - entry.windowStart > windowMs) {
      hits.delete(userId);
      hits.set(userId, { count: 1, windowStart: now });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
      return;
    }

    entry.count++;
    return next();
  };
}

// Redis-backed rate limiter keyed on IP (for unauthenticated routes like auth)
export function createRedisRateLimit(windowSeconds: number, maxRequests: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}`;

    try {
      const raw = await redisGet(key);
      const count = raw ? parseInt(raw, 10) : 0;

      if (count >= maxRequests) {
        res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
        return;
      }

      await redisSet(key, String(count + 1), windowSeconds);
      return next();
    } catch {
      // If Redis fails, allow the request through
      return next();
    }
  };
}

// Pre-built rate limiters for different endpoint tiers
export const chatRateLimit = createRateLimit(60_000, 3);        // 3/min  — Gemini chat
export const aiRateLimit = createRateLimit(60_000, 3);          // 3/min  — Gemini insights
export const accountsRateLimit = createRateLimit(60_000, 30);   // 30/min — Plaid account fetches
export const exportRateLimit = createRateLimit(60_000, 5);      // 5/min  — PDF/CSV exports
export const authRateLimit = createRedisRateLimit(60, 5);       // 5/min per IP — OTP endpoints
