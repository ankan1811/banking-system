"use client"

import { useState, useEffect } from 'react';
import { getRecurring } from '@/lib/api/analytics.api';
import { aiCategoryColors } from '@/constants';
import type { RecurringPattern } from '@shared/types';

export default function RecurringTransactionsCard() {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getRecurring()
      .then((res) => setPatterns(res.recurring))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || patterns.length === 0) return null;

  const monthlyTotal = patterns
    .filter((p) => p.frequency === 'monthly')
    .reduce((sum, p) => sum + Number(p.normalizedAmount), 0);

  const shown = expanded ? patterns : patterns.slice(0, 4);

  return (
    <div className="glass-card p-5">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-sm font-semibold text-white">Recurring & Subscriptions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {patterns.length} detected · ~${Number(monthlyTotal).toFixed(2)}/mo committed
          </p>
        </div>
        <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2">
          {shown.map((p, i) => {
            const color = aiCategoryColors[p.category] || '#78716c';
            const nextDate = new Date(p.nextExpected);
            const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <p className="text-xs text-white font-medium truncate max-w-[160px]">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category} · {p.frequency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white">${Number(p.normalizedAmount).toFixed(2)}</p>
                  <p className={`text-xs ${daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {daysUntil > 0 ? `in ${daysUntil}d` : 'due now'}
                  </p>
                </div>
              </div>
            );
          })}

          {!expanded && patterns.length > 4 && (
            <p className="text-xs text-slate-500 text-center pt-1">+{patterns.length - 4} more</p>
          )}
        </div>
      )}
    </div>
  );
}
