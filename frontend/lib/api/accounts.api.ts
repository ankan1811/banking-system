import { serverApiRequest } from './server-client';

export async function getAccounts() {
  return serverApiRequest('/api/accounts');
}

export async function getAccount(bankRecordId: string) {
  return serverApiRequest(`/api/accounts/${bankRecordId}`);
}
