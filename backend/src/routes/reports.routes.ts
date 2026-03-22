import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getMonthlyDigest, generateDigestPDF } from '../services/digest.service.js';

const router = Router();

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

// GET /api/reports/digest?month=YYYY-MM
router.get('/digest', async (req: Request, res: Response) => {
  try {
    const { month } = querySchema.parse(req.query);
    const userId = (req as any).userId as string;
    const useAi = req.query.ai === 'true';
    const digest = await getMonthlyDigest(userId, month, useAi);
    res.json({ digest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Digest error:', error);
    res.status(500).json({ error: 'Failed to generate monthly digest' });
  }
});

// GET /api/reports/digest/pdf?month=YYYY-MM
router.get('/digest/pdf', async (req: Request, res: Response) => {
  try {
    const { month } = querySchema.parse(req.query);
    const userId = (req as any).userId as string;
    const digest = await getMonthlyDigest(userId, month);
    const pdf = await generateDigestPDF(digest);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="digest-${month}.pdf"`);
    res.send(pdf);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Digest PDF error:', error);
    res.status(500).json({ error: 'Failed to generate digest PDF' });
  }
});

export default router;
