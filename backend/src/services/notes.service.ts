import { prisma } from '../lib/db.js';
import { redisGet, redisSet, redisDel, redisDelByPrefix } from '../lib/redis.js';

const NOTES_TTL_S = 24 * 60 * 60; // 24 hours in seconds

async function invalidateNotesCache(userId: string) {
  await redisDelByPrefix(`notes:${userId}:`);
  await redisDel(`tags:${userId}`);
}

export async function batchGetNotes(userId: string, hashes: string[]) {
  const cacheKey = `notes:${userId}:${hashes.sort().join(',')}`;
  const raw = await redisGet(cacheKey);
  if (raw) return new Map<string, any>(JSON.parse(raw));

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

  await redisSet(cacheKey, JSON.stringify([...map.entries()]), NOTES_TTL_S);
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
  await invalidateNotesCache(userId);
  return result;
}

export async function deleteNote(userId: string, transactionHash: string) {
  const existing = await prisma.transactionNote.findUnique({
    where: { transactionHash_userId: { transactionHash, userId } },
  });
  if (!existing) throw new Error('Note not found');
  await prisma.transactionNote.delete({ where: { id: existing.id } });
  await invalidateNotesCache(userId);
}

export async function getUserTags(userId: string): Promise<string[]> {
  const cacheKey = `tags:${userId}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as string[];

  const notes = await prisma.transactionNote.findMany({
    where: { userId, tags: { isEmpty: false } },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const n of notes) {
    for (const t of n.tags) tagSet.add(t);
  }

  const tags = [...tagSet].sort();
  await redisSet(cacheKey, JSON.stringify(tags), NOTES_TTL_S);
  return tags;
}
