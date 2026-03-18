import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getAlerts, createAlert, updateAlert, deleteAlert } from '../services/alerts.service.js';
import { AI_CATEGORIES } from '@shared/types';

const router = Router();

const createSchema = z.object({
  type: z.enum(['category_monthly_limit', 'single_transaction', 'balance_below']),
  threshold: z.number().positive(),
  category: z.enum(AI_CATEGORIES as [string, ...string[]]).optional(),
});

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().positive().optional(),
});

// GET /api/alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const alerts = await getAlerts(userId);
    res.json({ alerts });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, threshold, category } = createSchema.parse(req.body);
    if (type === 'category_monthly_limit' && !category) {
      res.status(400).json({ error: 'category is required for category_monthly_limit alerts' });
      return;
    }
    const userId = (req as any).userId as string;
    const alert = await createAlert(userId, type, threshold, category as any);
    res.json({ alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// PATCH /api/alerts/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const alert = await updateAlert(userId, req.params.id, data);
    res.json({ alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as Error).message === 'Alert not found') {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteAlert(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Alert not found') {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
