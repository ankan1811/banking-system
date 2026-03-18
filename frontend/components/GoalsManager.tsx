"use client"

import { useState, useEffect } from 'react';
import { getGoals, createGoal } from '@/lib/api/goals.api';
import type { SavingsGoal } from '@shared/types';
import GoalCard from './GoalCard';

const EMOJI_OPTIONS = ['🎯', '🏠', '✈️', '🚗', '💍', '📱', '💻', '🎓', '💊', '🌴', '💰', '🐾'];
const COLOR_OPTIONS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#6366f1', '#22c55e'];

export default function GoalsManager() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    emoji: '🎯',
    color: '#8b5cf6',
  });

  const load = () => {
    setLoading(true);
    getGoals()
      .then((res) => setGoals(res.goals))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.targetAmount) return;
    await createGoal({
      name: form.name,
      targetAmount: parseFloat(form.targetAmount),
      targetDate: form.targetDate || undefined,
      emoji: form.emoji,
      color: form.color,
    });
    setCreating(false);
    setForm({ name: '', targetAmount: '', targetDate: '', emoji: '🎯', color: '#8b5cf6' });
    load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-slate-700/50 rounded-full" />
              <div className="flex-1 space-y-2 pt-2">
                <div className="h-3 w-32 bg-slate-700/50 rounded" />
                <div className="h-2 w-20 bg-slate-700/50 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error}</p></div>;

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status === 'completed');
  const abandoned = goals.filter((g) => g.status === 'abandoned');

  return (
    <div className="space-y-4">
      {/* Active goals */}
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => <GoalCard key={g.id} goal={g} onUpdate={load} />)}
        </div>
      )}

      {active.length === 0 && !creating && (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">No active goals yet. Create your first savings goal!</p>
        </div>
      )}

      {/* Create new goal form */}
      {creating ? (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Savings Goal</h3>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Goal name (e.g. Emergency Fund)"
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              placeholder="Target amount ($)"
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`w-8 h-8 rounded-lg text-base transition-colors ${
                    form.emoji === e ? 'bg-violet-600/40 border border-violet-500/50' : 'bg-slate-700/50 hover:bg-slate-600/50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Color</p>
            <div className="flex gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm"
            >
              Create Goal
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
          + Create new savings goal
        </button>
      )}

      {/* Completed goals */}
      {done.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Completed</p>
          <div className="space-y-2">
            {done.map((g) => <GoalCard key={g.id} goal={g} onUpdate={load} />)}
          </div>
        </div>
      )}

      {/* Abandoned goals */}
      {abandoned.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Abandoned</p>
          <div className="space-y-2">
            {abandoned.map((g) => <GoalCard key={g.id} goal={g} onUpdate={load} />)}
          </div>
        </div>
      )}
    </div>
  );
}
