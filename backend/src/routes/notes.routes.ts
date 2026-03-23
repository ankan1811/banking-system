import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { batchGetNotes, upsertNote, deleteNote, getUserTags } from '../services/notes.service.js';

const router = Router();

const upsertSchema = z.object({
  transactionHash: z.string().min(1),
  note: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// POST /api/notes — upsert note
router.post('/', async (req: Request, res: Response) => {
  try {
    const { transactionHash, note, tags } = upsertSchema.parse(req.body);
    const userId = (req as any).userId as string;
    const result = await upsertNote(userId, transactionHash, note ?? null, tags ?? []);
    res.json({ note: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// DELETE /api/notes/:hash
router.delete('/:hash', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await deleteNote(userId, req.params.hash as string);
    res.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Note not found') {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// GET /api/notes/batch?hashes=h1,h2,h3
router.get('/batch', async (req: Request, res: Response) => {
  try {
    const hashesStr = z.string().min(1).parse(req.query.hashes);
    const hashes = hashesStr.split(',').filter(Boolean);
    const userId = (req as any).userId as string;
    const notesMap = await batchGetNotes(userId, hashes);
    res.json({ notes: Object.fromEntries(notesMap) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/tags
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const tags = await getUserTags(userId);
    res.json({ tags });
  } catch {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

export default router;
