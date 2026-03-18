import { apiRequest } from './client';
import type { SplitGroup, SplitSummary } from '@shared/types';

export async function getSplits(status?: string) {
  const qs = status ? `?status=${status}` : '';
  return apiRequest<{ splits: SplitGroup[] }>(`/api/splits${qs}`);
}

export async function getSplitSummary() {
  return apiRequest<{ summary: SplitSummary }>('/api/splits/summary');
}

export async function getSplitById(id: string) {
  return apiRequest<{ split: SplitGroup }>(`/api/splits/${id}`);
}

export async function createSplit(data: {
  title: string;
  totalAmount: number;
  transactionId?: string;
  splitType: 'equal' | 'custom';
  participants: { email: string; name: string; amount?: number }[];
}) {
  return apiRequest<{ split: SplitGroup }>('/api/splits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function settleParticipant(splitId: string, participantId: string, isPaid: boolean) {
  return apiRequest<{ split: SplitGroup }>(`/api/splits/${splitId}/participants/${participantId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isPaid }),
  });
}

export async function deleteSplit(id: string) {
  return apiRequest<{ success: boolean }>(`/api/splits/${id}`, { method: 'DELETE' });
}
