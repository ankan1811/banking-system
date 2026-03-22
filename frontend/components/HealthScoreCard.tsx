"use client"

import { useState, useEffect } from 'react';
import { getHealthScore } from '@/lib/api/health-score.api';
import type { HealthScore } from '@shared/types';
import { Sparkles } from 'lucide-react';

const SCORE_COLORS = {
  low: { ring: '#ef4444', bg: 'text-rose-400', label: 'Needs Work' },
  mid: { ring: '#f59e0b', bg: 'text-amber-400', label: 'Good' },
  high: { ring: '#10b981', bg: 'text-emerald-400', label: 'Excellent' },
};

function getScoreStyle(score: number) {
  if (score >= 71) return SCORE_COLORS.high;
  if (score >= 41) return SCORE_COLORS.mid;
  return SCORE_COLORS.low;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  budgetAdherence: 'Budget Adherence',
  savingsRate: 'Savings Rate',
  spendingTrend: 'Spending Trend',
  goalProgress: 'Goal Progress',
};

export default function HealthScoreCard() {
  const [data, setData] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState<'ai' | 'formula'>('formula');
  const [aiGenerating, setAiGenerating] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    setLoading(true);
    getHealthScore(currentMonth, false)
      .then((res) => {
        setData(res.score);
        if (res.score?.source) setSource(res.score.source);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    try {
      const res = await getHealthScore(currentMonth, true);
      setData(res.score);
      if (res.score?.source) setSource(res.score.source);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse space-y-4">
        <div className="flex justify-center"><div className="w-32 h-32 bg-slate-700/50 rounded-full" /></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-2 bg-slate-700/50 rounded" />)}
        </div>
      </div>
    );
  }

  if (error || !data) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error || 'Unable to load'}</p></div>;

  const style = getScoreStyle(data.score);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = (data.score / 100) * circ;

  return (
    <div className="space-y-4">
      {/* Score gauge */}
      <div className="glass-card p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3 w-full justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Health Score</h3>
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
        <div className="relative">
          <svg width={140} height={140} className="-rotate-90">
            <circle cx={70} cy={70} r={radius} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={10} />
            <circle
              cx={70} cy={70} r={radius}
              fill="none"
              stroke={style.ring}
              strokeWidth={10}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${style.bg}`}>{data.score}</span>
            <span className="text-xs text-slate-500">/100</span>
          </div>
        </div>
        <p className={`text-sm font-medium mt-2 ${style.bg}`}>{style.label}</p>
        {data.generatedAt && (
          <p className="text-[10px] text-slate-600 mt-1">
            Updated {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Breakdown bars */}
      <div className="glass-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">Score Breakdown</h3>
        {Object.entries(data.breakdown).map(([key, value]) => {
          const barStyle = getScoreStyle(value);
          return (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{BREAKDOWN_LABELS[key] || key}</span>
                <span className={barStyle.bg}>{value}</span>
              </div>
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${value}%`, backgroundColor: barStyle.ring }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      {data.tips.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-2">Personalized Tips</h3>
          <ul className="space-y-1.5">
            {data.tips.map((tip, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="text-violet-400 shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
