import { apiRequest } from './client';

export interface SearchParams {
  q?: string;
  category?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  results: any[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchTransactions(bankRecordId: string, params: SearchParams) {
  const qs = new URLSearchParams({ bankRecordId });
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.amountMin !== undefined) qs.set('amountMin', String(params.amountMin));
  if (params.amountMax !== undefined) qs.set('amountMax', String(params.amountMax));
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiRequest<SearchResult>(`/api/search?${qs}`);
}
