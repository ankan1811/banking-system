import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  getManualAssets, createManualAsset, updateManualAsset, deleteManualAsset,
  getManualLiabilities, createManualLiability, updateManualLiability, deleteManualLiability,
  getNetWorth,
} from '../services/net-worth.service.js';

const router = Router();

const assetCreateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['property', 'vehicle', 'investment', 'cash', 'other']),
  value: z.number().positive(),
  notes: z.string().max(500).optional(),
});

const assetUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(['property', 'vehicle', 'investment', 'cash', 'other']).optional(),
  value: z.number().positive().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const liabilityCreateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['mortgage', 'auto_loan', 'student_loan', 'credit_card', 'personal_loan', 'other']),
  value: z.number().positive(),
  notes: z.string().max(500).optional(),
});

const liabilityUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(['mortgage', 'auto_loan', 'student_loan', 'credit_card', 'personal_loan', 'other']).optional(),
  value: z.number().positive().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// GET /api/net-worth
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const months = Math.max(3, Math.min(24, parseInt(req.query.months as string) || 12));
    const useAi = req.query.ai === 'true';
    const data = await getNetWorth(userId, months, useAi);
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to fetch net worth' });
  }
});

// ─── Assets CRUD ────────────────────────────────────────────

router.get('/assets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const assets = await getManualAssets(userId);
    res.json({ assets });
  } catch {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/assets', async (req: Request, res: Response) => {
  try {
    const data = assetCreateSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const asset = await createManualAsset(userId, data);
    res.json({ asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.patch('/assets/:id', async (req: Request, res: Response) => {
  try {
    const data = assetUpdateSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const asset = await updateManualAsset(userId, req.params.id, data);
    res.json({ asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as Error).message === 'Asset not found') {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/assets/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteManualAsset(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Asset not found') {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ─── Liabilities CRUD ───────────────────────────────────────

router.get('/liabilities', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const liabilities = await getManualLiabilities(userId);
    res.json({ liabilities });
  } catch {
    res.status(500).json({ error: 'Failed to fetch liabilities' });
  }
});

router.post('/liabilities', async (req: Request, res: Response) => {
  try {
    const data = liabilityCreateSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const liability = await createManualLiability(userId, data);
    res.json({ liability });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create liability' });
  }
});

router.patch('/liabilities/:id', async (req: Request, res: Response) => {
  try {
    const data = liabilityUpdateSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const liability = await updateManualLiability(userId, req.params.id, data);
    res.json({ liability });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as Error).message === 'Liability not found') {
      res.status(404).json({ error: 'Liability not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update liability' });
  }
});

router.delete('/liabilities/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteManualLiability(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Liability not found') {
      res.status(404).json({ error: 'Liability not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete liability' });
  }
});

export default router;
