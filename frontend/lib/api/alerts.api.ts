import { apiRequest } from './client';
import type { AlertRule, AICategory } from '@shared/types';

export async function getAlerts() {
  return apiRequest<{ alerts: AlertRule[] }>('/api/alerts');
}

export async function createAlert(data: {
  type: AlertRule['type'];
  threshold: number;
  category?: AICategory;
}) {
  return apiRequest<{ alert: AlertRule }>('/api/alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAlert(id: string, data: { enabled?: boolean; threshold?: number }) {
  return apiRequest<{ alert: AlertRule }>(`/api/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAlert(id: string) {
  return apiRequest<{ success: boolean }>(`/api/alerts/${id}`, { method: 'DELETE' });
}
