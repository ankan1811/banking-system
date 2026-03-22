import { apiRequest } from './client';
import type { Budget, BudgetStatus } from '@shared/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function getBudgets(month: string) {
  return apiRequest<{ budgets: Budget[] }>(`/api/budgets?month=${month}`);
}

export async function getBudgetStatus(month: string) {
  return apiRequest<{ statuses: BudgetStatus[] }>(
    `/api/budgets/status?month=${month}`
  );
}

export async function upsertBudget(category: string, monthlyLimit: number, month: string) {
  return apiRequest<{ budget: Budget }>('/api/budgets', {
    method: 'POST',
    body: JSON.stringify({ category, monthlyLimit, month }),
  });
}

export async function deleteBudget(id: string) {
  return apiRequest<{ success: boolean }>(`/api/budgets/${id}`, { method: 'DELETE' });
}

export function buildExportUrl(
  type: 'csv' | 'pdf',
  bankRecordId: string,
  from: string,
  to: string
): string {
  return `${API_BASE}/api/export/${type}?bankRecordId=${bankRecordId}&from=${from}&to=${to}`;
}
