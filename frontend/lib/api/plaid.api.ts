import { apiRequest } from './client';

export async function createLinkToken() {
  return apiRequest('/api/plaid/create-link-token', { method: 'POST' });
}

export async function exchangePublicToken(publicToken: string) {
  return apiRequest('/api/plaid/exchange-token', {
    method: 'POST',
    body: JSON.stringify({ publicToken }),
  });
}
