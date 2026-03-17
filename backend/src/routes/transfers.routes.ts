import { Router, type Request, type Response } from 'express';
import { createTransfer } from '../services/razorpay.service.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { senderBankId, receiverBankId, amount, name } = req.body;

    const result = await createTransfer({
      senderBankId,
      receiverBankId,
      amount: parseFloat(amount),
      name: name || 'Transfer',
    });

    res.json(result);
  } catch (error) {
    console.error('Transfer failed:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

export default router;
