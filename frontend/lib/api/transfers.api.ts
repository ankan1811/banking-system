import { apiRequest } from './client';

export async function createTransfer(data: any) {
  return apiRequest('/api/transfers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
