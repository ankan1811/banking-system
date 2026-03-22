import { apiRequest } from './client';
import type { FinancialPlan } from '@shared/types';

export async function getInsights(bankRecordId: string, currentMonth: string) {
  return apiRequest<{ insights: any }>('/api/ai/insights', {
    method: 'POST',
    body: JSON.stringify({ bankRecordId, currentMonth }),
  });
}

export async function generatePlan(description: string, bankRecordId: string) {
  return apiRequest<{ plan: FinancialPlan }>('/api/ai/financial-plan', {
    method: 'POST',
    body: JSON.stringify({ description, bankRecordId }),
  });
}
