import { apiRequest } from './client';

export async function createTransaction(data: any) {
  return apiRequest('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
