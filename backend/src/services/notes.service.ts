import { prisma } from '../lib/db.js';

// ─── In-memory caches ────────────────────────────────────────
const notesCache = new Map<string, { data: Map<string, any>; expiresAt: number }>();
const NOTES_TTL = 24 * 60 * 60 * 1000;
const userTagsCache = new Map<string, { data: string[]; expiresAt: number }>();
const TAGS_TTL = 24 * 60 * 60 * 1000;

function invalidateNotesCache(userId: string) {
  for (const [key] of notesCache) {
    if (key.startsWith(userId)) notesCache.delete(key);
  }
  userTagsCache.delete(userId);
}

export async function batchGetNotes(userId: string, hashes: string[]) {
  const cacheKey = `${userId}:${hashes.sort().join(',')}`;
  const cached = notesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const notes = await prisma.transactionNote.findMany({
    where: { userId, transactionHash: { in: hashes } },
  });

  const map = new Map<string, any>();
  for (const n of notes) {
    map.set(n.transactionHash, {
      id: n.id,
      transactionHash: n.transactionHash,
      userId: n.userId,
      note: n.note,
      tags: n.tags,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    });
  }

  notesCache.set(cacheKey, { data: map, expiresAt: Date.now() + NOTES_TTL });
  return map;
}

export async function upsertNote(
  userId: string,
  transactionHash: string,
  note: string | null,
  tags: string[]
) {
  const result = await prisma.transactionNote.upsert({
    where: { transactionHash_userId: { transactionHash, userId } },
    update: { note, tags },
    create: { userId, transactionHash, note, tags },
  });
  invalidateNotesCache(userId);
  return result;
}

export async function deleteNote(userId: string, transactionHash: string) {
  const existing = await prisma.transactionNote.findUnique({
    where: { transactionHash_userId: { transactionHash, userId } },
  });
  if (!existing) throw new Error('Note not found');
  await prisma.transactionNote.delete({ where: { id: existing.id } });
  invalidateNotesCache(userId);
}

export async function getUserTags(userId: string): Promise<string[]> {
  const cached = userTagsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const notes = await prisma.transactionNote.findMany({
    where: { userId, tags: { isEmpty: false } },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const n of notes) {
    for (const t of n.tags) tagSet.add(t);
  }

  const tags = [...tagSet].sort();
  userTagsCache.set(userId, { data: tags, expiresAt: Date.now() + TAGS_TTL });
  return tags;
}
