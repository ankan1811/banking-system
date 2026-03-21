import { Router, type Request, type Response } from 'express';
import { getAccounts, getAccount } from '../services/bank.service.js';

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
    const bankRecordId = req.params.bankRecordId;
    if (!bankRecordId || bankRecordId === 'undefined') {
      res.status(404).json({ error: 'No bank specified' });
      return;
    }
    const result = await getAccount(bankRecordId, req.userId);
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

export default router;
