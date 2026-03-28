import { getAccount } from './bank.service.js';

export interface SearchParams {
  q?: string;
  category?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export async function searchTransactions(bankRecordId: string, params: SearchParams, userId: string) {
  const { transactions } = await getAccount(bankRecordId, userId);

  let filtered = [...transactions];

  // Text search on name and merchantName
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((t) =>
      (t.name || '').toLowerCase().includes(q) ||
      ((t as any).merchantName || '').toLowerCase().includes(q)
    );
  }

  // Category filter
  if (params.category) {
    filtered = filtered.filter((t) =>
      ((t as any).aiCategory || t.category || 'Other') === params.category
    );
  }

  // Amount range
  if (params.amountMin !== undefined) {
    filtered = filtered.filter((t) => Math.abs(t.amount) >= params.amountMin!);
  }
  if (params.amountMax !== undefined) {
    filtered = filtered.filter((t) => Math.abs(t.amount) <= params.amountMax!);
  }

  // Date range
  if (params.dateFrom) {
    filtered = filtered.filter((t) => (t.date || '') >= params.dateFrom!);
  }
  if (params.dateTo) {
    filtered = filtered.filter((t) => (t.date || '') <= params.dateTo!);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / params.limit);
  const start = (params.page - 1) * params.limit;
  const results = filtered.slice(start, start + params.limit);

  return { results, total, page: params.page, totalPages };
}
