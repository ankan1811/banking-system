import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db.js';
import { parseStatement } from '../services/statement-parser.service.js';
import { categorizeTransactions } from '../services/gemini.service.js';
import { hashTransaction } from '../services/bank.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// POST /api/statements/upload — create new manual bank + import transactions
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const bankName = req.body.bankName;

    if (!bankName) {
      res.status(400).json({ error: 'bankName is required' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsed = parseStatement(csvContent);

    // Create a manual bank record
    const bank = await prisma.bank.create({
      data: {
        userId,
        bankId: `manual-${randomUUID().slice(0, 8)}`,
        accountId: `manual-${randomUUID().slice(0, 8)}`,
        source: 'manual',
        accountName: bankName,
        accountType: 'depository',
        accountSubtype: 'savings',
        lastSyncedAt: new Date(),
      },
    });

    // Store transactions
    const transactionCount = await insertTransactions(bank.id, bank.accountId, parsed);

    res.json({ bankRecordId: bank.id, transactionCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload statement';
    console.error('Statement upload error:', error);
    res.status(400).json({ error: message });
  }
});

// POST /api/statements/upload/:bankRecordId — append to existing manual bank
router.post('/upload/:bankRecordId', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { bankRecordId } = req.params;

    const bank = await prisma.bank.findFirst({
      where: { id: bankRecordId as string, userId, source: 'manual' },
    });
    if (!bank) {
      res.status(404).json({ error: 'Manual bank not found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsed = parseStatement(csvContent);

    const transactionCount = await insertTransactions(bank.id, bank.accountId, parsed);

    res.json({ bankRecordId: bank.id, transactionCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload statement';
    console.error('Statement upload error:', error);
    res.status(400).json({ error: message });
  }
});

// ─── Helper: insert parsed transactions ──────────────────────

async function insertTransactions(
  bankId: string,
  accountId: string,
  parsed: ReturnType<typeof parseStatement>
): Promise<number> {
  // Categorize transactions using rule-based regex
  const withCategory = categorizeTransactions(
    parsed.map((t) => ({
      id: randomUUID(),
      name: t.name,
      merchantName: t.name,
      amount: t.amount,
      date: t.date,
      category: '',
    }))
  );

  // Build DB rows, using hash to deduplicate
  const rows = withCategory.map((t) => ({
    id: hashTransaction(t.name, t.amount, t.date), // deterministic ID for dedup
    bankId,
    name: t.name,
    merchantName: t.merchantName || t.name,
    paymentChannel: 'branch',
    type: t.amount > 0 ? 'debit' : 'credit',
    accountId,
    amount: Math.abs(t.amount),
    pending: false,
    category: t.aiCategory || '',
    date: t.date,
    image: null,
    syncedAt: new Date(),
  }));

  await prisma.plaidTransaction.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return rows.length;
}

export default router;
