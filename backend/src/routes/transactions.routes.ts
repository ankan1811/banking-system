import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { createTransaction, getTransactionsByBankId } from '../services/transaction.service.js';

const router = Router();

const createTransactionSchema = z.object({
  name: z.string().min(1),
  amount: z.string().min(1),
  senderId: z.string().min(1),
  senderBankId: z.string().min(1),
  receiverId: z.string().min(1),
  receiverBankId: z.string().min(1),
  email: z.string().email(),
});

// POST /api/transactions
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    const transaction = await createTransaction(data);
    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// GET /api/transactions/by-bank/:bankId
router.get('/by-bank/:bankId', async (req: Request, res: Response) => {
  try {
    const bankId = req.params.bankId as string;
    const result = await getTransactionsByBankId(bankId);
    res.json(result);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
