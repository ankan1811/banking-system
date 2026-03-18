import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getBudgets, upsertBudget, deleteBudget, getBudgetStatus } from '../services/budget.service.js';
import { AI_CATEGORIES } from '@shared/types';

const router = Router();

const upsertSchema = z.object({
  category: z.enum(AI_CATEGORIES as [string, ...string[]]),
  monthlyLimit: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const statusQuerySchema = z.object({
  bankRecordId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

// GET /api/budgets?month=YYYY-MM
router.get('/', async (req: Request, res: Response) => {
  try {
    const month = z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.month);
    const userId = (req as any).userId as string;
    const budgets = await getBudgets(userId, month);
    res.json({ budgets });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET /api/budgets/status?bankRecordId=x&month=YYYY-MM
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { bankRecordId, month } = statusQuerySchema.parse(req.query);
    const userId = (req as any).userId as string;
    const statuses = await getBudgetStatus(userId, bankRecordId, month);
    res.json({ statuses });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Budget status error:', error);
    res.status(500).json({ error: 'Failed to fetch budget status' });
  }
});

// POST /api/budgets
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, monthlyLimit, month } = upsertSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const budget = await upsertBudget(userId, category as any, monthlyLimit, month);
    res.json({ budget });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteBudget(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Budget not found') {
      res.status(404).json({ error: 'Budget not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;
