"use client"

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getIncomeVsExpense } from '@/lib/api/analytics.api';
import type { IncomeExpenseData } from '@shared/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

interface Props { bankRecordId: string; }

export default function IncomeExpenseChart({ bankRecordId }: Props) {
  const [data, setData] = useState<IncomeExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(6);

  useEffect(() => {
    setLoading(true);
    getIncomeVsExpense(bankRecordId, months)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bankRecordId, months]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse space-y-4">
        <div className="h-4 w-40 bg-slate-700/50 rounded" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-20 bg-slate-700/30 rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-slate-700/30 rounded" />
      </div>
    );
  }

  if (error || !data) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error || 'No data'}</p></div>;

  const { totals } = data;
  const fmt = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartData = {
    labels: data.months.map((m) => {
      const [y, mo] = m.split('-');
      return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Income',
        data: data.income,
        backgroundColor: '#10b981cc',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: data.expenses,
        backgroundColor: '#ef4444cc',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Income', value: fmt(totals.totalIncome), color: 'text-emerald-400' },
          { label: 'Total Expenses', value: fmt(totals.totalExpenses), color: 'text-rose-400' },
          { label: 'Net Savings', value: fmt(totals.totalNet), color: totals.totalNet >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { label: 'Avg Monthly', value: fmt(totals.avgMonthlyNet), color: totals.avgMonthlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400' },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Income vs Expenses</h3>
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

        <div className="h-56">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: $${(ctx.parsed.y as number).toFixed(2)}`,
                  },
                },
              },
              scales: {
                x: {
                  grid: { color: 'rgba(148,163,184,0.08)' },
                  ticks: { color: '#94a3b8', font: { size: 10 } },
                },
                y: {
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
      </div>

      {/* Net savings line */}
      <div className="glass-card p-4">
        <h4 className="text-xs text-slate-500 mb-2">Net Savings by Month</h4>
        <div className="flex items-end gap-1 h-12">
          {data.net.map((n, i) => {
            const maxAbs = Math.max(...data.net.map(Math.abs), 1);
            const pct = Math.abs(n) / maxAbs;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-sm transition-all ${n >= 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`}
                  style={{ height: `${pct * 100}%`, minHeight: 2 }}
                />
                <span className={`text-[9px] ${n >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {n >= 0 ? '+' : ''}{n.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
