import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getSpendingTrends, detectRecurring, getIncomeVsExpense, getMerchantInsights } from '../services/analytics.service.js';

const router = Router();

// GET /api/analytics/trends?bankRecordId=x&months=6
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const bankRecordId = z.string().min(1).parse(req.query.bankRecordId);
    const months = z.coerce.number().int().min(2).max(12).default(6).parse(req.query.months);
    const trends = await getSpendingTrends(bankRecordId, months);
    res.json({ trends });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch spending trends' });
  }
});

// GET /api/analytics/recurring?bankRecordId=x
router.get('/recurring', async (req: Request, res: Response) => {
  try {
    const bankRecordId = z.string().min(1).parse(req.query.bankRecordId);
    const recurring = await detectRecurring(bankRecordId);
    res.json({ recurring });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Recurring detection error:', error);
    res.status(500).json({ error: 'Failed to detect recurring transactions' });
  }
});

// GET /api/analytics/income-expense?bankRecordId=x&months=6
router.get('/income-expense', async (req: Request, res: Response) => {
  try {
    const bankRecordId = z.string().min(1).parse(req.query.bankRecordId);
    const months = z.coerce.number().int().min(2).max(12).default(6).parse(req.query.months);
    const data = await getIncomeVsExpense(bankRecordId, months);
    res.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Income/expense error:', error);
    res.status(500).json({ error: 'Failed to fetch income vs expense data' });
  }
});

// GET /api/analytics/merchants?bankRecordId=x&months=6
router.get('/merchants', async (req: Request, res: Response) => {
  try {
    const bankRecordId = z.string().min(1).parse(req.query.bankRecordId);
    const months = z.coerce.number().int().min(2).max(12).default(6).parse(req.query.months);
    const merchants = await getMerchantInsights(bankRecordId, months);
    res.json({ merchants });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Merchant insights error:', error);
    res.status(500).json({ error: 'Failed to fetch merchant insights' });
  }
});

export default router;
