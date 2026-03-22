import { apiRequest } from './client';
import type { HealthScore } from '@shared/types';

export async function getHealthScore(month: string, useAi: boolean = false) {
  const aiParam = useAi ? '&ai=true' : '';
  return apiRequest<{ score: HealthScore }>(
    `/api/health-score?month=${month}${aiParam}`
  );
}
