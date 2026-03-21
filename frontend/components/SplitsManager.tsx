"use client"

import { useState, useEffect, useRef } from 'react';
import { getSplits, getSplitSummary, createSplit } from '@/lib/api/splits.api';
import type { SplitGroup, SplitSummary } from '@shared/types';
import SplitCard from './SplitCard';

interface SplitsManagerProps {
  initialSplits?: SplitGroup[];
  initialSummary?: SplitSummary | null;
}

export default function SplitsManager({ initialSplits = [], initialSummary = null }: SplitsManagerProps) {
  const [splits, setSplits] = useState<SplitGroup[]>(initialSplits);
  const [summary, setSummary] = useState<SplitSummary | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [form, setForm] = useState({
    title: '',
    totalAmount: '',
    splitType: 'equal' as 'equal' | 'custom',
    participants: [{ name: '', email: '', amount: '' }],
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      getSplits(filter === 'all' ? undefined : filter),
      getSplitSummary(),
    ])
      .then(([splitsRes, summaryRes]) => {
        setSplits(splitsRes.splits);
        setSummary(summaryRes.summary);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    load();
  }, [filter]);

  const addParticipant = () => {
    setForm({ ...form, participants: [...form.participants, { name: '', email: '', amount: '' }] });
  };

  const removeParticipant = (idx: number) => {
    if (form.participants.length <= 1) return;
    setForm({ ...form, participants: form.participants.filter((_, i) => i !== idx) });
  };

  const updateParticipant = (idx: number, field: string, value: string) => {
    const updated = form.participants.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    setForm({ ...form, participants: updated });
  };

  const handleCreate = async () => {
    if (!form.title || !form.totalAmount || form.participants.some((p) => !p.name || !p.email)) return;
    try {
      await createSplit({
        title: form.title,
        totalAmount: parseFloat(form.totalAmount),
        splitType: form.splitType,
        participants: form.participants.map((p) => ({
          name: p.name,
          email: p.email,
          ...(form.splitType === 'custom' && p.amount ? { amount: parseFloat(p.amount) } : {}),
        })),
      });
      setCreating(false);
      setForm({ title: '', totalAmount: '', splitType: 'equal', participants: [{ name: '', email: '', amount: '' }] });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-slate-700/50 rounded" />
              <div className="h-2 w-48 bg-slate-700/50 rounded" />
              <div className="h-1.5 bg-slate-700/50 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error}</p></div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-lg font-bold text-emerald-400">${summary.totalOwedToYou.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Owed to You</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-lg font-bold text-amber-400">{summary.pendingCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Pending</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-lg font-bold text-slate-400">{summary.settledCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Settled</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'pending', 'settled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs transition-colors capitalize ${
              filter === f ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Split list */}
      {splits.length > 0 ? (
        <div className="space-y-3">
          {splits.map((s) => <SplitCard key={s.id} split={s} onUpdate={load} />)}
        </div>
      ) : (
        !creating && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-slate-500 mb-3">No splits yet. Create one to start splitting expenses!</p>
          </div>
        )
      )}

      {/* Create form */}
      {creating ? (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Split</h3>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What's this split for? (e.g. Dinner at Joe's)"
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              placeholder="Total amount ($)"
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
            <div className="flex rounded-lg overflow-hidden border border-slate-600/50">
              {(['equal', 'custom'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, splitType: t })}
                  className={`px-3 py-2 text-xs capitalize transition-colors ${
                    form.splitType === t ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Participants</p>
            {form.participants.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateParticipant(idx, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                />
                <input
                  type="email"
                  value={p.email}
                  onChange={(e) => updateParticipant(idx, 'email', e.target.value)}
                  placeholder="Email"
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                />
                {form.splitType === 'custom' && (
                  <input
                    type="number"
                    value={p.amount}
                    onChange={(e) => updateParticipant(idx, 'amount', e.target.value)}
                    placeholder="$"
                    className="w-20 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                  />
                )}
                {form.participants.length > 1 && (
                  <button
                    onClick={() => removeParticipant(idx)}
                    className="text-slate-600 hover:text-rose-400 text-sm"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addParticipant}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Add person
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm"
            >
              Create Split
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full text-sm text-slate-500 hover:text-violet-400 border border-dashed border-slate-700/50 hover:border-violet-500/30 rounded-xl py-3 transition-colors"
        >
          + Create new split
        </button>
      )}
    </div>
  );
}
