const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/';
      return new Promise(() => {}) as T;
    }
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}
