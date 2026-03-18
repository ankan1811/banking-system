import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getHealthScore } from '../services/health-score.service.js';

const router = Router();

const querySchema = z.object({
  bankRecordId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

// GET /api/health-score?bankRecordId=x&month=YYYY-MM
router.get('/', async (req: Request, res: Response) => {
  try {
    const { bankRecordId, month } = querySchema.parse(req.query);
    const userId = (req as any).userId as string;
    const score = await getHealthScore(userId, bankRecordId, month);
    res.json({ score });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Health score error:', error);
    res.status(500).json({ error: 'Failed to generate health score' });
  }
});

export default router;
