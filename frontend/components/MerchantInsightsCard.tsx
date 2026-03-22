"use client"

import { useState, useEffect } from 'react';
import { getMerchantInsights } from '@/lib/api/analytics.api';
import { aiCategoryColors } from '@/constants';
import type { MerchantInsight } from '@shared/types';

interface Props { bankRecordId: string; }

export default function MerchantInsightsCard({ bankRecordId }: Props) {
  const [merchants, setMerchants] = useState<MerchantInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(6);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getMerchantInsights(bankRecordId, months)
      .then((res) => setMerchants(res.merchants))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bankRecordId, months]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse space-y-3">
        <div className="h-4 w-40 bg-slate-700/50 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="h-3 w-32 bg-slate-700/50 rounded" />
            <div className="h-3 w-16 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error}</p></div>;

  const filtered = search
    ? merchants.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : merchants;

  const totalSpent = merchants.reduce((s, m) => s + m.totalSpent, 0);

  const categoryTotals = merchants.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + m.totalSpent;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategoryAmount = sortedCategories[0]?.[1] ?? 1;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Top Merchants</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {merchants.length} merchants · ${totalSpent.toFixed(2)} total
          </p>
        </div>
        <div className="flex gap-1">
          {([3, 6, 12] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                months === m ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search merchants..."
        className="w-full px-3 py-1.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merchant list */}
        <div className="space-y-1 max-h-[520px] overflow-y-auto">
          {filtered.map((m, i) => {
            const color = aiCategoryColors[m.category] || '#78716c';
            const pct = totalSpent > 0 ? (m.totalSpent / totalSpent) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
                {/* Rank */}
                <span className="text-xs text-slate-600 w-5 text-right shrink-0">{i + 1}</span>

                {/* Category dot */}
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* Name + category */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {m.category} · {m.transactionCount} txns · avg ${m.avgAmount.toFixed(2)}
                  </p>
                </div>

                {/* Amount + trend */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-white font-medium">${m.totalSpent.toFixed(2)}</p>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[10px] text-slate-600">{pct.toFixed(1)}%</span>
                    {m.trend !== 0 && (
                      <span className={`text-[10px] ${m.trend > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {m.trend > 0 ? '↑' : '↓'}{Math.abs(m.trend).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No merchants found</p>
          )}
        </div>

        {/* Category breakdown */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Spending by Category</h3>
            <p className="text-xs text-slate-500 mt-0.5">{sortedCategories.length} categories · last {months}mo</p>
          </div>
          <div className="space-y-2">
            {sortedCategories.map(([category, amount]) => {
              const color = aiCategoryColors[category] || '#78716c';
              const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              const barWidth = (amount / maxCategoryAmount) * 100;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-slate-300">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                      <span className="text-xs text-white font-medium">${amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
            {sortedCategories.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No category data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
