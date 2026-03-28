import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { exportCSV, exportPDF } from '../services/export.service.js';

const router = Router();

const querySchema = z.object({
  bankRecordId: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// GET /api/export/csv
router.get('/csv', async (req: Request, res: Response) => {
  try {
    const { bankRecordId, from, to } = querySchema.parse(req.query);
    const csv = await exportCSV(bankRecordId, from, to, req.userId!);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${from}-to-${to}.csv"`);
    res.send(csv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/export/pdf
router.get('/pdf', async (req: Request, res: Response) => {
  try {
    const { bankRecordId, from, to } = querySchema.parse(req.query);
    const pdf = await exportPDF(bankRecordId, from, to, req.userId!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="statement-${from}-to-${to}.pdf"`);
    res.send(pdf);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

export default router;
