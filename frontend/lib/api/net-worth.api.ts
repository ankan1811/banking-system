import { apiRequest } from './client';
import type { NetWorthData, ManualAsset, ManualLiability } from '@shared/types';

export async function getNetWorth(months = 12, useAi: boolean = false) {
  const aiParam = useAi ? '&ai=true' : '';
  return apiRequest<{ data: NetWorthData }>(`/api/net-worth?months=${months}${aiParam}`);
}

export async function getManualAssets() {
  return apiRequest<{ assets: ManualAsset[] }>('/api/net-worth/assets');
}

export async function createManualAsset(data: { name: string; category: string; value: number; notes?: string }) {
  return apiRequest<{ asset: ManualAsset }>('/api/net-worth/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateManualAsset(id: string, data: Partial<{ name: string; category: string; value: number; notes: string | null }>) {
  return apiRequest<{ asset: ManualAsset }>(`/api/net-worth/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteManualAsset(id: string) {
  return apiRequest<{ success: boolean }>(`/api/net-worth/assets/${id}`, { method: 'DELETE' });
}

export async function getManualLiabilities() {
  return apiRequest<{ liabilities: ManualLiability[] }>('/api/net-worth/liabilities');
}

export async function createManualLiability(data: { name: string; category: string; value: number; notes?: string }) {
  return apiRequest<{ liability: ManualLiability }>('/api/net-worth/liabilities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateManualLiability(id: string, data: Partial<{ name: string; category: string; value: number; notes: string | null }>) {
  return apiRequest<{ liability: ManualLiability }>(`/api/net-worth/liabilities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteManualLiability(id: string) {
  return apiRequest<{ success: boolean }>(`/api/net-worth/liabilities/${id}`, { method: 'DELETE' });
}
