import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { generateSpendingInsights } from '../services/gemini.service.js';
import { getAccount } from '../services/bank.service.js';

const router = Router();

const insightsSchema = z.object({
  bankRecordId: z.string().min(1),
  currentMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

// POST /api/ai/insights
router.post('/insights', async (req: Request, res: Response) => {
  try {
    const { bankRecordId, currentMonth } = insightsSchema.parse(req.body);
    const userId = (req as any).userId as string;

    const { transactions } = await getAccount(bankRecordId);
    const insights = await generateSpendingInsights(transactions, currentMonth, userId);

    res.json({ insights });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
