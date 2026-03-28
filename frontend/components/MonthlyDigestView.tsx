"use client"

import { useState, useEffect } from 'react';
import { getMonthlyDigest, buildDigestPdfUrl } from '@/lib/api/reports.api';
import { aiCategoryColors } from '@/constants';
import type { MonthlyDigest } from '@shared/types';
import { Sparkles } from 'lucide-react';

export default function MonthlyDigestView() {
  const [digest, setDigest] = useState<MonthlyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [source, setSource] = useState<'ai' | 'formula'>('formula');
  const [aiGenerating, setAiGenerating] = useState(false);

  const load = (m: string) => {
    setLoading(true);
    setError('');
    getMonthlyDigest(m, false)
      .then((res) => {
        setDigest(res.digest);
        if (res.digest?.narrativeSource) setSource(res.digest.narrativeSource);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(month); }, [month]);

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    try {
      const res = await getMonthlyDigest(month, true);
      setDigest(res.digest);
      if (res.digest?.narrativeSource) setSource(res.digest.narrativeSource);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setMonth(next);
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-6 animate-pulse space-y-2">
            <div className="h-4 w-32 bg-slate-700/50 rounded" />
            <div className="h-3 w-full bg-slate-700/50 rounded" />
            <div className="h-3 w-3/4 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !digest) {
    return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error || 'Unable to load digest.'}</p></div>;
  }

  const { sections, narrative } = digest;
  const ie = sections.incomeVsExpense;
  const hs = sections.healthScore;
  const scoreColor = hs.score >= 70 ? 'text-emerald-400' : hs.score >= 40 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-4">
      {/* Month navigator + PDF export */}
      <div className="glass-card p-4 flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="p-1.5 text-slate-400 hover:text-white">←</button>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-white">{monthLabel}</h3>
          <p className="text-xs text-slate-500">Monthly Digest</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(buildDigestPdfUrl(month), '_blank')}
            className="px-2.5 py-1 text-xs text-violet-300 border border-violet-500/30 hover:bg-violet-600/20 rounded-lg transition-colors"
          >
            PDF
          </button>
          <button onClick={() => navigateMonth(1)} className="p-1.5 text-slate-400 hover:text-white">→</button>
        </div>
      </div>

      {/* Health Score */}
      <div className="glass-card p-6 text-center">
        <p className="text-xs text-slate-500 mb-1">Financial Health Score</p>
        <p className={`text-4xl font-bold ${scoreColor}`}>{hs.score}</p>
        <p className="text-xs text-slate-600 mt-1">out of 100</p>
        <div className="flex justify-center gap-4 mt-3">
          {Object.entries(hs.breakdown).map(([key, val]) => (
            <div key={key} className="text-center">
              <p className="text-sm font-medium text-white">{val}</p>
              <p className="text-[10px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Narrative */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">AI Summary</h3>
            {source === 'ai' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">AI-generated</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-400">Formula-based</span>
            )}
          </div>
          <button
            onClick={handleGenerateAi}
            disabled={aiGenerating}
            className="px-3 py-1.5 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 rounded-lg text-white font-medium transition-all flex items-center gap-1.5"
          >
            {aiGenerating ? (
              <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
            ) : source === 'ai' ? (
              <><Sparkles className="w-3 h-3" />Regenerate</>
            ) : (
              <><Sparkles className="w-3 h-3" />Generate with AI</>
            )}
          </button>
        </div>
        {narrative.split('\n\n').map((p, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed mb-2 last:mb-0">{p}</p>
        ))}
      </div>

      {/* Income vs Expense */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-3">Income vs Expenses</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-lg font-bold text-emerald-400">${Number(ie.totals.totalIncome).toFixed(0)}</p>
            <p className="text-xs text-slate-500">Income</p>
          </div>
          <div className="text-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <p className="text-lg font-bold text-rose-400">${Number(ie.totals.totalExpenses).toFixed(0)}</p>
            <p className="text-xs text-slate-500">Expenses</p>
          </div>
          <div className={`text-center p-3 rounded-lg border ${
            ie.totals.totalNet >= 0
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/20'
          }`}>
            <p className={`text-lg font-bold ${ie.totals.totalNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${Math.abs(Number(ie.totals.totalNet)).toFixed(0)}
            </p>
            <p className="text-xs text-slate-500">{ie.totals.totalNet >= 0 ? 'Saved' : 'Deficit'}</p>
          </div>
        </div>
      </div>

      {/* Budget Adherence */}
      {sections.budgetAdherence.totalBudgets > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Budget Performance</h3>
          <p className="text-xs text-slate-500 mb-3">
            {sections.budgetAdherence.overBudgetCount > 0
              ? `${sections.budgetAdherence.overBudgetCount} over budget`
              : 'All budgets on track'}
          </p>
          <div className="space-y-2.5">
            {sections.budgetAdherence.statuses
              .filter((b) => b.monthlyLimit !== null)
              .slice(0, 6)
              .map((b) => {
                const pct = Math.min(b.percentUsed || 0, 100);
                const isOver = (b.percentUsed || 0) >= 100;
                const isWarn = (b.percentUsed || 0) >= 75;
                const color = aiCategoryColors[b.category] || '#78716c';
                const barColor = isOver ? '#ef4444' : isWarn ? '#f59e0b' : color;
                return (
                  <div key={b.category}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-300">{b.category}</span>
                      <span className="text-slate-500">
                        ${Number(b.spent).toFixed(0)} / ${Number(b.monthlyLimit!).toFixed(0)}
                        {isOver && <span className="text-rose-400 ml-1">over!</span>}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Goals */}
      {sections.goalProgress.activeCount + sections.goalProgress.completedCount > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Savings Goals</h3>
          <div className="flex gap-4 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{sections.goalProgress.activeCount}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{sections.goalProgress.completedCount}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-violet-400">${Number(sections.goalProgress.totalSavedAmount).toFixed(0)}</p>
              <p className="text-xs text-slate-500">Total Saved</p>
            </div>
          </div>
          <div className="space-y-2">
            {sections.goalProgress.goals
              .filter((g) => g.status === 'active')
              .slice(0, 4)
              .map((g) => {
                const pct = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-300">{g.emoji || '🎯'} {g.name}</span>
                      <span className="text-slate-500">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Top Merchants */}
      {sections.topMerchants.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Top Merchants</h3>
          <div className="space-y-2">
            {sections.topMerchants.map((m, i) => {
              const color = aiCategoryColors[m.category] || '#78716c';
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-4 text-right">{i + 1}.</span>
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div>
                      <p className="text-xs text-white">{m.name}</p>
                      <p className="text-[10px] text-slate-500">{m.transactionCount} txns · {m.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white font-medium">${Number(m.totalSpent).toFixed(2)}</p>
                    {m.trend !== 0 && (
                      <p className={`text-[10px] ${m.trend > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {m.trend > 0 ? '↑' : '↓'} {Math.abs(m.trend).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-slate-600 text-center">
        Generated {new Date(digest.generatedAt).toLocaleString('en-US')}
      </p>
    </div>
  );
}
