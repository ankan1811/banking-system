import type { Request, Response, NextFunction } from 'express';

export function createRateLimit(windowMs: number, maxRequests: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
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
  };
}

// Pre-built rate limiters for different endpoint tiers
export const chatRateLimit = createRateLimit(60_000, 10);       // 10/min — AI chat
export const aiRateLimit = createRateLimit(60_000, 5);          // 5/min  — Gemini insights
export const accountsRateLimit = createRateLimit(60_000, 30);   // 30/min — Plaid account fetches
export const analyticsRateLimit = createRateLimit(60_000, 15);  // 15/min — analytics endpoints
export const exportRateLimit = createRateLimit(60_000, 5);      // 5/min  — PDF/CSV exports
