import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { searchTransactions } from '../services/search.service.js';

const router = Router();

const searchSchema = z.object({
  bankRecordId: z.string().min(1),
  q: z.string().optional(),
  category: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// GET /api/search?bankRecordId=x&q=coffee&category=Food+%26+Dining&...
router.get('/', async (req: Request, res: Response) => {
  try {
    const params = searchSchema.parse(req.query);
    const { bankRecordId, ...searchParams } = params;
    const result = await searchTransactions(bankRecordId, searchParams);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search transactions' });
  }
});

export default router;
