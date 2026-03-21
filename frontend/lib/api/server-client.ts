import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:8787';

// Per-request deduplication — same path returns the same promise within a render pass
const inflightRequests = new Map<string, Promise<any>>();

export async function serverApiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase() || 'GET';

  // Only deduplicate GET requests
  if (method === 'GET' && inflightRequests.has(path)) {
    return inflightRequests.get(path)! as Promise<T>;
  }

  const token = cookies().get('session-token')?.value;
  const promise = fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `session-token=${token}` } : {}),
      ...options?.headers,
    },
    cache: 'no-store',
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 401) return null as T;
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `API error: ${res.status}`);
    }
    return res.json();
  }).finally(() => {
    inflightRequests.delete(path);
  });

  if (method === 'GET') {
    inflightRequests.set(path, promise);
  }

  return promise;
}
