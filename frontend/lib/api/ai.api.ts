import { apiRequest } from './client';
import type { FinancialPlan } from '@shared/types';

export async function getInsights(currentMonth: string, useAi: boolean = false) {
  return apiRequest<{ insights: any }>('/api/ai/insights', {
    method: 'POST',
    body: JSON.stringify({ currentMonth, useAi }),
  });
}

export async function generatePlan(description: string) {
  return apiRequest<{ plan: FinancialPlan }>('/api/ai/financial-plan', {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}
