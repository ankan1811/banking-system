import { apiRequest } from './client';

export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}) {
  return apiRequest<any>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount() {
  return apiRequest<{ success: boolean }>('/api/auth/account', { method: 'DELETE' });
}

export async function disconnectBank(bankId: string) {
  return apiRequest<{ success: boolean }>(`/api/banks/${bankId}`, { method: 'DELETE' });
}
