import type { Request, Response, NextFunction } from 'express';

const windowMs = 60 * 1000; // 1 minute
const maxRequests = 10;

const hits = new Map<string, { count: number; windowStart: number }>();

export function chatRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as string;
  if (!userId) return next();

  const now = Date.now();
  const entry = hits.get(userId);

  if (!entry || now - entry.windowStart > windowMs) {
    hits.set(userId, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= maxRequests) {
    res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
    return;
  }

  entry.count++;
  return next();
}
