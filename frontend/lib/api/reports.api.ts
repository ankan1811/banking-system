import { apiRequest } from './client';
import type { MonthlyDigest } from '@shared/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function getMonthlyDigest(bankRecordId: string, month: string, useAi: boolean = false) {
  const aiParam = useAi ? '&ai=true' : '';
  return apiRequest<{ digest: MonthlyDigest }>(
    `/api/reports/digest?bankRecordId=${bankRecordId}&month=${month}${aiParam}`
  );
}

export function buildDigestPdfUrl(bankRecordId: string, month: string): string {
  return `${API_BASE}/api/reports/digest/pdf?bankRecordId=${bankRecordId}&month=${month}`;
}
