"use client"

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getSpendingTrends } from '@/lib/api/analytics.api';
import { aiCategoryColors } from '@/constants';
import type { TrendsData } from '@shared/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

interface Props {
  bankRecordId: string;
}

export default function SpendingTrendsChart({ bankRecordId }: Props) {
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [months, setMonths] = useState(6);

  useEffect(() => {
    setLoading(true);
    getSpendingTrends(bankRecordId, months)
      .then((res) => setTrends(res.trends))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bankRecordId, months]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-4 w-40 bg-slate-700/50 rounded mb-4" />
        <div className="h-48 bg-slate-700/30 rounded" />
      </div>
    );
  }

  if (error || !trends) {
    return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error || 'No data'}</p></div>;
  }

  const visibleCategories = trends.categories.filter((c) => !hidden.has(c));

  const chartData = {
    labels: trends.months.map((m) => {
      const [y, mo] = m.split('-');
      return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: visibleCategories.map((cat) => ({
      label: cat,
      data: trends.data[cat] || [],
      backgroundColor: (aiCategoryColors[cat] || '#78716c') + 'cc',
      borderColor: aiCategoryColors[cat] || '#78716c',
      borderWidth: 1,
      borderRadius: 4,
    })),
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">Spending Trends</h3>
        <div className="flex gap-1">
          {([3, 6, 12] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                months === m
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Category toggles */}
      <div className="flex flex-wrap gap-1.5">
        {trends.categories.map((cat) => {
          const color = aiCategoryColors[cat] || '#78716c';
          const isHidden = hidden.has(cat);
          return (
            <button
              key={cat}
              onClick={() => {
                const next = new Set(hidden);
                if (isHidden) next.delete(cat); else next.add(cat);
                setHidden(next);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                isHidden
                  ? 'border-slate-700/50 text-slate-600'
                  : 'border-slate-600/50 text-slate-300'
              }`}
              style={!isHidden ? { borderColor: color + '60' } : undefined}
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isHidden ? '#475569' : color }}
              />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {visibleCategories.length > 0 ? (
        <div className="h-56">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: $${(ctx.parsed.y as number).toFixed(2)}`,
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { color: 'rgba(148,163,184,0.08)' },
                  ticks: { color: '#94a3b8', font: { size: 10 } },
                },
                y: {
                  stacked: true,
                  grid: { color: 'rgba(148,163,184,0.08)' },
                  ticks: {
                    color: '#94a3b8',
                    font: { size: 10 },
                    callback: (v) => `$${v}`,
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500 py-8 text-center">All categories hidden. Click a toggle to show.</p>
      )}
    </div>
  );
}
