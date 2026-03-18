"use client"

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { NetWorthSnapshot } from '@shared/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function NetWorthChart({
  history,
  months,
  onMonthsChange,
}: {
  history: NetWorthSnapshot[];
  months: number;
  onMonthsChange: (n: number) => void;
}) {
  const labels = history.map((s) => {
    const [y, m] = s.month.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total Assets',
        data: history.map((s) => s.totalAssets),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#10b981',
        tension: 0.3,
      },
      {
        label: 'Liabilities',
        data: history.map((s) => s.totalLiabilities),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#ef4444',
        tension: 0.3,
      },
      {
        label: 'Net Worth',
        data: history.map((s) => s.netWorth),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#8b5cf6',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148,163,184,0.2)',
        borderWidth: 1,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`,
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
          callback: (value: any) => '$' + (value / 1000).toFixed(0) + 'k',
        },
      },
    },
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Net Worth Over Time</h3>
        <div className="flex gap-1">
          {([6, 12, 24] as const).map((m) => (
            <button
              key={m}
              onClick={() => onMonthsChange(m)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                months === m ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {[
          { label: 'Assets', color: '#10b981' },
          { label: 'Liabilities', color: '#ef4444' },
          { label: 'Net Worth', color: '#8b5cf6' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="h-56">
        {history.length > 1 ? (
          <Line data={chartData} options={options as any} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-slate-600">Add more monthly snapshots to see trends</p>
          </div>
        )}
      </div>
    </div>
  );
}
