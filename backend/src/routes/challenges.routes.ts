import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  getChallenges, createChallenge, abandonChallenge,
  getAiSuggestions, getChallengesOverview,
} from '../services/challenges.service.js';

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  type: z.enum(['category_limit', 'no_spend', 'savings_target']),
  category: z.string().optional(),
  targetAmount: z.number().positive().optional(),
  duration: z.enum(['weekly', 'monthly']),
  isAiGenerated: z.boolean().optional(),
});

// GET /api/challenges
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const status = req.query.status as string | undefined;
    const challenges = await getChallenges(userId, status);
    res.json({ challenges });
  } catch {
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// GET /api/challenges/overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const overview = await getChallengesOverview(userId);
    res.json({ overview });
  } catch {
    res.status(500).json({ error: 'Failed to fetch challenges overview' });
  }
});

// GET /api/challenges/suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const useAi = req.query.ai === 'true';
    const result = await getAiSuggestions(userId, useAi);
    res.json({ suggestions: result.suggestions, source: result.source });
  } catch {
    res.status(500).json({ error: 'Failed to fetch AI suggestions' });
  }
});

// POST /api/challenges
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const challenge = await createChallenge(userId, data);
    res.json({ challenge });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// PATCH /api/challenges/:id/abandon
router.patch('/:id/abandon', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const challenge = await abandonChallenge(userId, req.params.id);
    res.json({ challenge });
  } catch (error) {
    if ((error as Error).message === 'Challenge not found') {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to abandon challenge' });
  }
});

export default router;
