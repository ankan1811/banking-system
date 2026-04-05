"use client"

import { useState, useEffect, useRef } from 'react';
import { UtensilsCrossed, Home, CircleCheck } from 'lucide-react';
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

  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.title || !form.totalAmount || form.participants.some((p) => !p.name || !p.email)) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
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
            <p className="text-lg font-bold text-emerald-400">${Number(summary.totalOwedToYou).toFixed(2)}</p>
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
          <div className="glass-card p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">No splits yet</h3>
              <p className="text-xs text-slate-500">Split bills with friends and family, then track who has paid.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
                <UtensilsCrossed size={20} className="text-violet-400 mx-auto" />
                <p className="text-[11px] text-slate-400 mt-1">Split a dinner</p>
                <p className="text-[10px] text-slate-500">Divide equally or custom</p>
              </div>
              <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
                <Home size={20} className="text-violet-400 mx-auto" />
                <p className="text-[11px] text-slate-400 mt-1">Share rent</p>
                <p className="text-[10px] text-slate-500">Custom amounts per person</p>
              </div>
              <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
                <CircleCheck size={20} className="text-violet-400 mx-auto" />
                <p className="text-[11px] text-slate-400 mt-1">Track payments</p>
                <p className="text-[10px] text-slate-500">Mark who has paid back</p>
              </div>
            </div>
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
              disabled={submitting}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? 'Creating...' : 'Create Split'}
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
