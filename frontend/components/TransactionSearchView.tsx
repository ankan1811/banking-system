"use client"

import { useState, useEffect, useCallback } from 'react';
import { searchTransactions, type SearchParams, type SearchResult } from '@/lib/api/search.api';
import { AI_CATEGORIES } from '@shared/types';
import TransactionsTable from './TransactionsTable';
import { Pagination } from './Pagination';

interface Props { bankRecordId: string; }

export default function TransactionSearchView({ bankRecordId }: Props) {
  const [params, setParams] = useState<SearchParams>({ page: 1, limit: 10 });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const hasFilters = !!(params.q || params.category || params.amountMin !== undefined || params.amountMax !== undefined || params.dateFrom || params.dateTo);

  const doSearch = useCallback(async (p: SearchParams) => {
    setLoading(true);
    try {
      const res = await searchTransactions(bankRecordId, p);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [bankRecordId]);

  // Debounced search on param change
  useEffect(() => {
    if (!hasFilters) { setResult(null); return; }
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => doSearch(params), 300);
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [params, hasFilters]);

  const updateParam = (key: keyof SearchParams, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const clearAll = () => {
    setParams({ page: 1, limit: 10 });
    setResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={params.q || ''}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-9 pr-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white border border-slate-600/30 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2">
          <select
            value={params.category || ''}
            onChange={(e) => updateParam('category', e.target.value)}
            className="px-2 py-1.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="">All categories</option>
            {AI_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="number"
            value={params.amountMin ?? ''}
            onChange={(e) => updateParam('amountMin', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Min $"
            className="w-20 px-2 py-1.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
          <input
            type="number"
            value={params.amountMax ?? ''}
            onChange={(e) => updateParam('amountMax', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Max $"
            className="w-20 px-2 py-1.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />

          <input
            type="date"
            value={params.dateFrom || ''}
            onChange={(e) => updateParam('dateFrom', e.target.value)}
            className="px-2 py-1.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-violet-500/50"
          />
          <span className="text-xs text-slate-600 self-center">to</span>
          <input
            type="date"
            value={params.dateTo || ''}
            onChange={(e) => updateParam('dateTo', e.target.value)}
            className="px-2 py-1.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {result.total} result{result.total !== 1 ? 's' : ''} found
          </p>
          <TransactionsTable transactions={result.results} />
          {result.totalPages > 1 && (
            <Pagination
              totalPages={result.totalPages}
              page={result.page}
            />
          )}
        </div>
      )}
    </div>
  );
}
