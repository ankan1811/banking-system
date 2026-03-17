import { Router, type Request, type Response } from 'express';
import { getBanks, getBank, getBankByAccountId } from '../services/user.service.js';

const router = Router();

// GET /api/banks
router.get('/', async (req: Request, res: Response) => {
  try {
    const banks = await getBanks(req.userId!);
    res.json(banks);
  } catch (error) {
    console.error('Error getting banks:', error);
    res.status(500).json({ error: 'Failed to get banks' });
  }
});

// GET /api/banks/by-account/:accountId
router.get('/by-account/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId as string;
    const bank = await getBankByAccountId(accountId);

    if (!bank) {
      res.status(404).json({ error: 'Bank not found' });
      return;
    }

    res.json(bank);
  } catch (error) {
    console.error('Error getting bank by account ID:', error);
    res.status(500).json({ error: 'Failed to get bank' });
  }
});

// GET /api/banks/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const bank = await getBank(id);

    if (!bank) {
      res.status(404).json({ error: 'Bank not found' });
      return;
    }

    res.json(bank);
  } catch (error) {
    console.error('Error getting bank:', error);
    res.status(500).json({ error: 'Failed to get bank' });
  }
});

export default router;
