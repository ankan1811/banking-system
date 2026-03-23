import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  getGoals, createGoal, updateGoal, deleteGoal,
  addContribution, getContributions,
} from '../services/goals.service.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.string().optional(),
  emoji: z.string().max(4).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().nullable().optional(),
  emoji: z.string().max(4).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
});

const contributeSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(200).optional(),
});

// GET /api/goals
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const goals = await getGoals(userId);
    res.json({ goals });
  } catch {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST /api/goals
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const goal = await createGoal(userId, data);
    res.json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PATCH /api/goals/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const goal = await updateGoal(userId, req.params.id as string, data);
    res.json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as Error).message === 'Goal not found') {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteGoal(userId, req.params.id as string);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Goal not found') {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// POST /api/goals/:id/contribute
router.post('/:id/contribute', async (req: Request, res: Response) => {
  try {
    const { amount, note } = contributeSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const result = await addContribution(userId, req.params.id as string, amount, note);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as Error).message === 'Goal not found') {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to add contribution' });
  }
});

// GET /api/goals/:id/contributions
router.get('/:id/contributions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const contributions = await getContributions(userId, req.params.id as string);
    res.json({ contributions });
  } catch (error) {
    if ((error as Error).message === 'Goal not found') {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

export default router;
