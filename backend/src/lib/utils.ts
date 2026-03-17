export function extractCustomerIdFromUrl(url: string): string {
  const parts = url.split('/');
  const customerId = parts[parts.length - 1];
  return customerId;
}

export function encryptId(id: string): string {
  return btoa(id);
}

export function decryptId(id: string): string {
  return atob(id);
}
