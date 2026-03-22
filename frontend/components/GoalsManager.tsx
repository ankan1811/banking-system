"use client"

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getGoals, createGoal } from '@/lib/api/goals.api';
import { generatePlan } from '@/lib/api/ai.api';
import type { SavingsGoal, FinancialPlan } from '@shared/types';
import GoalCard from './GoalCard';

const EMOJI_OPTIONS = ['🎯', '🏠', '✈️', '🚗', '💍', '📱', '💻', '🎓', '💊', '🌴', '💰', '🐾'];
const COLOR_OPTIONS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#6366f1', '#22c55e'];

const PLAN_SUGGESTIONS = [
  'Save for an emergency fund',
  'Save $10,000 for a down payment in 2 years',
  'Build a 3-month expense buffer',
];

const FEASIBILITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Easy' },
  moderate: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Moderate' },
  challenging: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Challenging' },
  very_challenging: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Very Challenging' },
};

export default function GoalsManager({ bankRecordId }: { bankRecordId?: string }) {
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

  // AI Plan state
  const [showPlanGenerator, setShowPlanGenerator] = useState(false);
  const [planDescription, setPlanDescription] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  const [planError, setPlanError] = useState('');
  const [creatingFromPlan, setCreatingFromPlan] = useState(false);

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

  const handleGeneratePlan = async () => {
    if (!planDescription.trim() || !bankRecordId) return;
    setPlanLoading(true);
    setPlanError('');
    setPlan(null);
    try {
      const res = await generatePlan(planDescription, bankRecordId);
      setPlan(res.plan);
    } catch (err: any) {
      setPlanError(err.message || 'Failed to generate plan');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleCreateFromPlan = async () => {
    if (!plan) return;
    setCreatingFromPlan(true);
    try {
      await createGoal({
        name: plan.goalName,
        targetAmount: plan.targetAmount,
        targetDate: plan.targetDate || undefined,
        emoji: plan.suggestedEmoji || '🎯',
        color: plan.suggestedColor || '#8b5cf6',
      });
      setPlan(null);
      setPlanDescription('');
      setShowPlanGenerator(false);
      load();
    } catch (err: any) {
      setPlanError(err.message || 'Failed to create goal');
    } finally {
      setCreatingFromPlan(false);
    }
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

  const feasibilityStyle = plan ? FEASIBILITY_STYLES[plan.feasibility] || FEASIBILITY_STYLES.moderate : null;

  return (
    <div className="space-y-4">
      {/* AI Financial Planner */}
      {bankRecordId && (
        <div className="glass-card p-5 border border-violet-500/20">
          <button
            onClick={() => { setShowPlanGenerator(!showPlanGenerator); setPlan(null); setPlanError(''); setPlanDescription(''); }}
            className="flex items-center gap-2 w-full"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
              <Sparkles className="size-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-semibold text-white">AI Financial Planner</h3>
              <p className="text-xs text-slate-500">Describe a goal and get a personalized savings plan</p>
            </div>
            <svg className={`size-4 text-slate-500 transition-transform ${showPlanGenerator ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showPlanGenerator && (
            <div className="mt-4 space-y-3">
              {!plan ? (
                <>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Describe your financial goal... e.g. 'I want to save $5,000 for a vacation in 6 months'"
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
                  />

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {PLAN_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setPlanDescription(s)}
                        className="px-2.5 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white rounded-full transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {planError && <p className="text-xs text-rose-400">{planError}</p>}

                  <button
                    onClick={handleGeneratePlan}
                    disabled={!planDescription.trim() || planLoading}
                    className="w-full py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {planLoading ? (
                      <>
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating plan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Generate Plan
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Plan results */
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{plan.suggestedEmoji}</span>
                      <h4 className="text-sm font-semibold text-white">{plan.goalName}</h4>
                    </div>
                    {feasibilityStyle && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${feasibilityStyle.bg} ${feasibilityStyle.text}`}>
                        {feasibilityStyle.label}
                      </span>
                    )}
                  </div>

                  {/* Key stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500">Target</p>
                      <p className="text-sm font-semibold text-white">${plan.targetAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500">Monthly</p>
                      <p className="text-sm font-semibold text-white">${plan.monthlySavingsNeeded.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500">Target Date</p>
                      <p className="text-sm font-semibold text-white">{new Date(plan.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Milestones */}
                  {plan.milestones.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Milestones</p>
                      <div className="space-y-0">
                        {plan.milestones.map((m, i) => (
                          <div key={m.month} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-2.5 h-2.5 rounded-full ${i === plan.milestones.length - 1 ? 'bg-emerald-400' : 'bg-violet-400'}`} />
                              {i < plan.milestones.length - 1 && <div className="w-px flex-1 bg-slate-700" />}
                            </div>
                            <div className="pb-3 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium text-slate-300">
                                  {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-xs text-violet-400">${m.targetSaved.toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{m.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {plan.tips.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Tips</p>
                      <ul className="space-y-1">
                        {plan.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-slate-400 flex gap-1.5">
                            <span className="text-violet-400 mt-0.5">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {planError && <p className="text-xs text-rose-400">{planError}</p>}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCreateFromPlan}
                      disabled={creatingFromPlan}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      {creatingFromPlan ? 'Creating...' : 'Create Goal from Plan'}
                    </button>
                    <button
                      onClick={() => { setPlan(null); setPlanDescription(''); }}
                      className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
                    >
                      New Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
