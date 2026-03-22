import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { generateSpendingInsights, generateFinancialPlan } from '../services/gemini.service.js';
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

// POST /api/ai/financial-plan
const financialPlanSchema = z.object({
  description: z.string().min(1).max(1000),
  bankRecordId: z.string().min(1),
});

router.post('/financial-plan', async (req: Request, res: Response) => {
  try {
    const { description, bankRecordId } = financialPlanSchema.parse(req.body);
    const userId = (req as any).userId as string;

    const plan = await generateFinancialPlan(description, bankRecordId, userId);
    res.json({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error generating financial plan:', error);
    res.status(500).json({ error: 'Failed to generate financial plan' });
  }
});

export default router;
