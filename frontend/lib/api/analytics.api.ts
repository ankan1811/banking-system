import { apiRequest } from './client';
import type { TrendsData, RecurringPattern } from '@shared/types';

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
