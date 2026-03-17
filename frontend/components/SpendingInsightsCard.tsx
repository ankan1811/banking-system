"use client"

import { useState, useEffect } from 'react';
import { getInsights } from '@/lib/api/ai.api';
import { aiCategoryColors } from '@/constants';

interface SpendingInsight {
  summary: string;
  monthComparison: { category: string; currentAmount: number; previousAmount: number; changePercent: number }[];
  topCategories: { category: string; amount: number; transactionCount: number }[];
  anomalies: string[];
  savingsTips: string[];
  generatedAt: string;
}

const SpendingInsightsCard = ({ bankRecordId }: { bankRecordId: string }) => {
  const [insights, setInsights] = useState<SpendingInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    getInsights(bankRecordId, currentMonth)
      .then((res) => setInsights(res.insights))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bankRecordId]);

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-slate-700/50 rounded" />
        <div className="h-3 w-full bg-slate-700/50 rounded" />
        <div className="h-3 w-3/4 bg-slate-700/50 rounded" />
        <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-slate-500">{error || 'Unable to load insights.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-2">AI Spending Summary</h3>
        <p className="text-sm text-slate-300 leading-relaxed">{insights.summary}</p>
      </div>

      {/* Top Categories */}
      {insights.topCategories.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Top Spending Categories</h3>
          <div className="space-y-3">
            {insights.topCategories.slice(0, 5).map((cat) => {
              const maxAmount = insights.topCategories[0]?.amount || 1;
              const pct = (cat.amount / maxAmount) * 100;
              const color = aiCategoryColors[cat.category] || '#78716c';
              return (
                <div key={cat.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{cat.category}</span>
                    <span className="text-slate-400">${cat.amount.toFixed(2)} ({cat.transactionCount} txns)</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month-over-Month */}
      {insights.monthComparison.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Month-over-Month</h3>
          <div className="flex flex-wrap gap-2">
            {insights.monthComparison.map((item) => {
              const isUp = item.changePercent > 0;
              return (
                <div
                  key={item.category}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    isUp
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  {item.category} {isUp ? '↑' : '↓'} {Math.abs(item.changePercent).toFixed(0)}%
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {insights.anomalies.length > 0 && (
        <div className="glass-card p-6 border border-amber-500/20">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">Unusual Activity</h3>
          <ul className="space-y-1.5">
            {insights.anomalies.map((a, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="text-amber-400 shrink-0">!</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Savings Tips */}
      {insights.savingsTips.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-2">Savings Tips</h3>
          <ul className="space-y-1.5">
            {insights.savingsTips.map((tip, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="text-emerald-400 shrink-0">$</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SpendingInsightsCard;
