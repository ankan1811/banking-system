import type { Request, Response, NextFunction } from 'express';
import { verifySession } from '../services/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await verifySession(req);

    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
