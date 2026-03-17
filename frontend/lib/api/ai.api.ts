import { apiRequest } from './client';

export async function getInsights(bankRecordId: string, currentMonth: string) {
  return apiRequest<{ insights: any }>('/api/ai/insights', {
    method: 'POST',
    body: JSON.stringify({ bankRecordId, currentMonth }),
  });
}
