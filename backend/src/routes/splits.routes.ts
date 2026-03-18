import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  getSplits, getSplitById, createSplit, updateParticipantStatus,
  deleteSplit, getSplitSummary,
} from '../services/splits.service.js';

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(100),
  totalAmount: z.number().positive(),
  transactionId: z.string().optional(),
  splitType: z.enum(['equal', 'custom']),
  participants: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    amount: z.number().positive().optional(),
  })).min(1).max(20),
});

const settleSchema = z.object({
  isPaid: z.boolean(),
});

// GET /api/splits
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const status = req.query.status as string | undefined;
    const splits = await getSplits(userId, status);
    res.json({ splits });
  } catch {
    res.status(500).json({ error: 'Failed to fetch splits' });
  }
});

// GET /api/splits/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const summary = await getSplitSummary(userId);
    res.json({ summary });
  } catch {
    res.status(500).json({ error: 'Failed to fetch split summary' });
  }
});

// GET /api/splits/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const split = await getSplitById(userId, req.params.id);
    res.json({ split });
  } catch (error) {
    if ((error as Error).message === 'Split not found') {
      res.status(404).json({ error: 'Split not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch split' });
  }
});

// POST /api/splits
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const split = await createSplit(userId, data);
    res.json({ split });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create split' });
  }
});

// PATCH /api/splits/:id/participants/:pid
router.patch('/:id/participants/:pid', async (req: Request, res: Response) => {
  try {
    const { isPaid } = settleSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const split = await updateParticipantStatus(userId, req.params.id, req.params.pid, isPaid);
    res.json({ split });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as Error).message === 'Split not found') {
      res.status(404).json({ error: 'Split not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// DELETE /api/splits/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteSplit(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Split not found') {
      res.status(404).json({ error: 'Split not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete split' });
  }
});

export default router;
