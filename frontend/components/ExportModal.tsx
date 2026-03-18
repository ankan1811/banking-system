"use client"

import { useState } from 'react';
import { buildExportUrl } from '@/lib/api/budgets.api';

interface Props {
  bankRecordId: string;
  accountName?: string;
}

export default function ExportModal({ bankRecordId, accountName }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const handleExport = (type: 'csv' | 'pdf') => {
    const url = buildExportUrl(type, bankRecordId, from, to);
    window.open(url, '_blank');
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30 hover:border-slate-500/50 rounded-lg text-slate-300 hover:text-white text-xs transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative glass-card p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Export Transactions</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>

            {accountName && (
              <p className="text-xs text-slate-500">{accountName}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleExport('csv')}
                className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm transition-colors"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex-1 py-2 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg text-sm transition-colors"
              >
                PDF Statement
              </button>
            </div>
            <p className="text-xs text-slate-600 text-center">Opens as a download in a new tab</p>
          </div>
        </div>
      )}
    </>
  );
}
