import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:8787';

export async function serverApiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = cookies().get('session-token')?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `session-token=${token}` } : {}),
      ...options?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) return null as T;
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}
