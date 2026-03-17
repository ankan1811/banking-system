import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { createLinkToken, exchangePublicToken } from '../services/plaid.service.js';
import { getUserInfo } from '../services/user.service.js';

const router = Router();

const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1),
});

// POST /api/plaid/create-link-token
router.post('/create-link-token', async (req: Request, res: Response) => {
  try {
    const user = await getUserInfo(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const result = await createLinkToken(user.id, user.firstName, user.lastName);
    res.json(result);
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// POST /api/plaid/exchange-token
router.post('/exchange-token', async (req: Request, res: Response) => {
  try {
    const { publicToken } = exchangeTokenSchema.parse(req.body);

    const user = await getUserInfo(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const result = await exchangePublicToken(publicToken, {
      id: user.id,
      email: user.email,
      razorpayContactId: user.razorpayContactId || '',
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      address1: user.address1,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
      dateOfBirth: user.dateOfBirth,
      ssn: user.ssn,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

export default router;
