import { apiRequest } from './client';
import type { MonthlyDigest } from '@shared/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function getMonthlyDigest(month: string, useAi: boolean = false) {
  const aiParam = useAi ? '&ai=true' : '';
  return apiRequest<{ digest: MonthlyDigest }>(
    `/api/reports/digest?month=${month}${aiParam}`
  );
}

export function buildDigestPdfUrl(month: string): string {
  return `${API_BASE}/api/reports/digest/pdf?month=${month}`;
}
