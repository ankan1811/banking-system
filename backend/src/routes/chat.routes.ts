import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { chat } from '../services/gemini.service.js';
import { chatRateLimit } from '../middleware/rateLimit.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .max(50)
    .default([]),
});

// POST /api/chat
router.post('/', chatRateLimit, async (req: Request, res: Response) => {
  try {
    const { message, history } = chatSchema.parse(req.body);
    const userId = (req as any).userId as string;

    const reply = await chat(userId, history, message);
    res.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

export default router;
