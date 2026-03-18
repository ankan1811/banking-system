import { apiRequest } from './client';
import type { TransactionNote } from '@shared/types';

export async function batchGetNotes(hashes: string[]) {
  return apiRequest<{ notes: Record<string, TransactionNote> }>(
    `/api/notes/batch?hashes=${hashes.join(',')}`
  );
}

export async function upsertNote(transactionHash: string, note: string | null, tags: string[]) {
  return apiRequest<{ note: TransactionNote }>('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ transactionHash, note, tags }),
  });
}

export async function deleteNote(hash: string) {
  return apiRequest<{ success: boolean }>(`/api/notes/${hash}`, { method: 'DELETE' });
}

export async function getUserTags() {
  return apiRequest<{ tags: string[] }>('/api/notes/tags');
}
