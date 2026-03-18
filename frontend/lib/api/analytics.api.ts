import { apiRequest } from './client';
import type { TrendsData, RecurringPattern, IncomeExpenseData, MerchantInsight } from '@shared/types';

export async function getSpendingTrends(bankRecordId: string, months = 6) {
  return apiRequest<{ trends: TrendsData }>(
    `/api/analytics/trends?bankRecordId=${bankRecordId}&months=${months}`
  );
}

export async function getRecurring(bankRecordId: string) {
  return apiRequest<{ recurring: RecurringPattern[] }>(
    `/api/analytics/recurring?bankRecordId=${bankRecordId}`
  );
}

export async function getIncomeVsExpense(bankRecordId: string, months = 6) {
  return apiRequest<{ data: IncomeExpenseData }>(
    `/api/analytics/income-expense?bankRecordId=${bankRecordId}&months=${months}`
  );
}

export async function getMerchantInsights(bankRecordId: string, months = 6) {
  return apiRequest<{ merchants: MerchantInsight[] }>(
    `/api/analytics/merchants?bankRecordId=${bankRecordId}&months=${months}`
  );
}
