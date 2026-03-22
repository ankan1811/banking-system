import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db.js';
import { parseStatement } from '../services/statement-parser.service.js';
import { aiCategorizeTransactions } from '../services/gemini.service.js';
import { hashTransaction } from '../services/bank.service.js';
import { encryptId } from '../lib/utils.js';
import { redisDelByPrefix } from '../lib/redis.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
    const accountId = `manual-${randomUUID().slice(0, 8)}`;
    const bank = await prisma.bank.create({
      data: {
        userId,
        bankId: `manual-${randomUUID().slice(0, 8)}`,
        accountId,
        shareableId: encryptId(accountId),
        source: 'manual',
        accountName: bankName,
        accountType: 'depository',
        accountSubtype: 'savings',
        lastSyncedAt: new Date(),
      },
    });

    // Compute balance from transactions
    const balance = parsed.reduce((acc, t) => {
      return t.type === 'credit' ? acc + Math.abs(t.amount) : acc - Math.abs(t.amount);
    }, 0);

    await prisma.bank.update({
      where: { id: bank.id },
      data: {
        currentBalance: Math.abs(balance),
        availableBalance: Math.abs(balance),
      },
    });

    // Store transactions
    const transactionCount = await insertTransactions(bank.id, bank.accountId, parsed);

    await invalidateUserCaches(userId);
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

    // Recalculate balance from all transactions for this bank
    const allTxns = await prisma.plaidTransaction.findMany({
      where: { bankId: bank.id },
      select: { amount: true, type: true },
    });
    const balance = allTxns.reduce((acc, t) => {
      const amt = Number(t.amount);
      return t.type === 'credit' ? acc + amt : acc - amt;
    }, 0);

    await prisma.bank.update({
      where: { id: bank.id },
      data: {
        currentBalance: Math.abs(balance),
        availableBalance: Math.abs(balance),
      },
    });

    // Invalidate user-level analytics caches (stale after appending)
    await Promise.all([
      redisDelByPrefix(`merchants:${userId}:`),
      redisDelByPrefix(`trends:${userId}:`),
      redisDelByPrefix(`recurring:${userId}`),
      redisDelByPrefix(`income-expense:${userId}:`),
      redisDelByPrefix(`budget-status:${userId}:`),
      redisDelByPrefix(`challenge-progress:${userId}`),
      redisDelByPrefix(`health:${userId}:`),
    ]);
    await invalidateUserCaches(userId);
    res.json({ bankRecordId: bank.id, transactionCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload statement';
    console.error('Statement upload error:', error);
    res.status(400).json({ error: message });
  }
});

// POST /api/statements/upload-dummy — load demo transactions for new users
router.post('/upload-dummy', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;

    const dummyAccountId = `manual-${randomUUID().slice(0, 8)}`;
    const bank = await prisma.bank.create({
      data: {
        userId,
        bankId: `manual-${randomUUID().slice(0, 8)}`,
        accountId: dummyAccountId,
        shareableId: encryptId(dummyAccountId),
        source: 'manual',
        accountName: 'SBI Bank',
        accountType: 'depository',
        accountSubtype: 'savings',
        lastSyncedAt: new Date(),
      },
    });

    // Read the sample SBI CSV from the frontend public folder
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const csvPath = resolve(__dirname, '../../../frontend/public/sample-sbi-statement.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const dummy = parseStatement(csvContent);

    const balance = dummy.reduce((acc: number, t) => {
      return t.type === 'credit' ? acc + Math.abs(t.amount) : acc - Math.abs(t.amount);
    }, 0);

    await prisma.bank.update({
      where: { id: bank.id },
      data: {
        currentBalance: Math.abs(balance),
        availableBalance: Math.abs(balance),
      },
    });

    const transactionCount = await insertTransactions(bank.id, bank.accountId, dummy);

    await invalidateUserCaches(userId);
    res.json({ bankRecordId: bank.id, transactionCount });
  } catch (error) {
    console.error('Dummy statement error:', error);
    res.status(500).json({ error: 'Failed to load dummy statement' });
  }
});

// ─── Helper: clear user-level analytics caches ──────────────

async function invalidateUserCaches(userId: string) {
  await Promise.all([
    redisDelByPrefix(`insights:${userId}:`),
    redisDelByPrefix(`chat-context:${userId}`),
    redisDelByPrefix(`fin-plan:${userId}:`),
    redisDelByPrefix(`health-score:${userId}`),
    redisDelByPrefix(`digest:${userId}`),
    redisDelByPrefix(`challenges:${userId}:`),
    redisDelByPrefix(`net-worth:${userId}`),
    redisDelByPrefix(`budget:${userId}:`),
  ]);
}

// ─── Helper: insert parsed transactions ──────────────────────

async function insertTransactions(
  bankId: string,
  accountId: string,
  parsed: ReturnType<typeof parseStatement>
): Promise<number> {
  // Categorize transactions using Gemini AI (falls back to regex on failure)
  const aiCategories = await aiCategorizeTransactions(
    parsed.map((t) => ({ name: t.name, amount: t.amount }))
  );

  // Build DB rows, using hash to deduplicate
  const rows = parsed.map((t, i) => ({
    id: hashTransaction(t.name, t.amount, t.date), // deterministic ID for dedup
    bankId,
    name: t.name,
    merchantName: t.name,
    paymentChannel: 'branch',
    type: t.amount > 0 ? 'debit' : 'credit',
    accountId,
    amount: Math.abs(t.amount),
    pending: false,
    category: aiCategories[i] || '',
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
