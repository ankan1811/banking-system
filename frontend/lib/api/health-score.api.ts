import { apiRequest } from './client';
import type { HealthScore } from '@shared/types';

export async function getHealthScore(bankRecordId: string, month: string) {
  return apiRequest<{ score: HealthScore }>(
    `/api/health-score?bankRecordId=${bankRecordId}&month=${month}`
  );
}
