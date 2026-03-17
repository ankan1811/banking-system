import { apiRequest } from './client';

export async function getBank(documentId: string) {
  return apiRequest(`/api/banks/${documentId}`);
}

export async function getBankByAccountId(accountId: string) {
  return apiRequest(`/api/banks/by-account/${accountId}`);
}
