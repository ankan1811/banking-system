import { apiRequest } from './client';
import type { TrendsData, RecurringPattern, IncomeExpenseData, MerchantInsight } from '@shared/types';

export async function getSpendingTrends(months = 6) {
  return apiRequest<{ trends: TrendsData }>(
    `/api/analytics/trends?months=${months}`
  );
}

export async function getRecurring() {
  return apiRequest<{ recurring: RecurringPattern[] }>(
    `/api/analytics/recurring`
  );
}

export async function getIncomeVsExpense(months = 6) {
  return apiRequest<{ data: IncomeExpenseData }>(
    `/api/analytics/income-expense?months=${months}`
  );
}

export async function getMerchantInsights(months = 6) {
  return apiRequest<{ merchants: MerchantInsight[] }>(
    `/api/analytics/merchants?months=${months}`
  );
}
