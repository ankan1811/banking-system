import { Redis } from 'ioredis';

// ─── In-memory fallback (guaranteed write, survives Redis outages) ──
type FallbackEntry = { value: string; expiresAt: number };
const fallback = new Map<string, FallbackEntry>();

// ─── Redis singleton (lazy init, only if REDIS_URL is set) ──────────
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    _redis.on('error', (err) => {
      console.warn('[redis] connection error:', err.message);
    });
  }
  return _redis;
}

// ─── Public helpers ──────────────────────────────────────────────────

/** Read a cached value. Tries Redis first, falls back to in-memory. */
export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(key);
      if (val !== null) return val;
    } catch (err) {
      console.warn('[redis] GET failed, falling back to in-memory:', (err as Error).message);
    }
  }

  const entry = fallback.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  return null;
}

/**
 * Write a cached value with a TTL.
 * CRITICAL: writes in-memory FIRST (cannot throw), then attempts Redis.
 * This guarantees data is never lost when a TTL expires and fresh data is re-inserted.
 */
export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  // Step 1: guaranteed write — Map.set() cannot throw
  fallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

  // Step 2: best-effort Redis write
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, value, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('[redis] SET failed, serving from in-memory:', (err as Error).message);
    }
  }
}

/** Delete a specific key from both Redis and in-memory. */
export async function redisDel(key: string): Promise<void> {
  fallback.delete(key);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn('[redis] DEL failed:', (err as Error).message);
    }
  }
}

/** Delete all keys matching a prefix (e.g. for notes invalidation). */
export async function redisDelByPrefix(prefix: string): Promise<void> {
  // Clear in-memory fallback
  for (const key of fallback.keys()) {
    if (key.startsWith(prefix)) fallback.delete(key);
  }

  // Clear Redis via SCAN (avoids blocking KEYS on large datasets)
  const redis = getRedis();
  if (redis) {
    try {
      const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
      const toDelete: string[] = [];
      for await (const keys of stream) {
        toDelete.push(...(keys as string[]));
      }
      if (toDelete.length > 0) await redis.del(...toDelete);
    } catch (err) {
      console.warn('[redis] DEL by prefix failed:', (err as Error).message);
    }
  }
}

/** Delete all keys matching a Redis glob pattern (for complex invalidation). */
export async function redisDelByPattern(pattern: string): Promise<void> {
  // Clear in-memory fallback (convert Redis glob to regex)
  const regex = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
  );
  for (const key of fallback.keys()) {
    if (regex.test(key)) fallback.delete(key);
  }

  // Clear Redis via SCAN
  const redis = getRedis();
  if (redis) {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const toDelete: string[] = [];
      for await (const keys of stream) {
        toDelete.push(...(keys as string[]));
      }
      if (toDelete.length > 0) await redis.del(...toDelete);
    } catch (err) {
      console.warn('[redis] DEL by pattern failed:', (err as Error).message);
    }
  }
}
