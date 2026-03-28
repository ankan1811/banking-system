import { Router, type Request, type Response } from 'express';
import { getAccounts, getAccount, syncBankFromPlaid } from '../services/bank.service.js';
import { getBank } from '../services/user.service.js';

const router = Router();

// GET /api/accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await getAccounts(req.userId!);
    res.json(result);
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// GET /api/accounts/:bankRecordId
router.get('/:bankRecordId', async (req: Request, res: Response) => {
  try {
    const bankRecordId = req.params.bankRecordId as string;
    if (!bankRecordId || bankRecordId === 'undefined') {
      res.status(404).json({ error: 'No bank specified' });
      return;
    }

    const page  = parseInt(req.query.page  as string) || 0;
    const limit = parseInt(req.query.limit as string) || 0;

    const result = await getAccount(bankRecordId, req.userId!);

    if (page > 0 && limit > 0) {
      const start      = (page - 1) * limit;
      const totalCount = result.transactions.length;
      return res.json({
        data: result.data,
        transactions: result.transactions.slice(start, start + limit),
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      });
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get account';
    if (message === 'Bank not found') {
      res.status(404).json({ error: message });
      return;
    }
    console.error('Error getting account:', error);
    res.status(500).json({ error: 'Failed to get account' });
  }
});

// POST /api/accounts/:bankRecordId/sync — manual resync with bank
router.post('/:bankRecordId/sync', async (req: Request, res: Response) => {
  try {
    const bank = await getBank(req.params.bankRecordId as string, req.userId!);
    if (!bank) {
      res.status(404).json({ error: 'Bank not found' });
      return;
    }

    // Synchronous Plaid call — user clicked resync, they want fresh data
    await syncBankFromPlaid(bank as { id: string; accessToken: string; accountId: string });

    // Return updated account data
    const result = await getAccount(bank.id, req.userId!);
    res.json(result);
  } catch (error) {
    console.error('Error syncing account:', error);
    res.status(500).json({ error: 'Failed to sync account' });
  }
});

export default router;
