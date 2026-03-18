"use client"

import { useState } from 'react';
import { abandonChallenge } from '@/lib/api/challenges.api';
import type { ChallengeProgress } from '@shared/types';

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  category_limit: { label: 'Budget', color: '#8b5cf6' },
  no_spend: { label: 'No-Spend', color: '#06b6d4' },
  savings_target: { label: 'Savings', color: '#22c55e' },
};

export default function ChallengeProgressCard({
  progress,
  onUpdate,
}: {
  progress: ChallengeProgress;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { challenge, currentSpent, targetAmount, percentUsed, daysRemaining, isOnTrack } = progress;

  const handleAbandon = async () => {
    if (!confirm('Abandon this challenge?')) return;
    setLoading(true);
    try {
      await abandonChallenge(challenge.id);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const typeBadge = TYPE_BADGES[challenge.type] || { label: challenge.type, color: '#64748b' };
  const isOverLimit = challenge.type === 'category_limit' && percentUsed > 100;
  const barColor = isOverLimit ? '#ef4444' : isOnTrack ? '#8b5cf6' : '#f59e0b';
  const barWidth = Math.min(percentUsed, 100);

  const isSavings = challenge.type === 'savings_target';
  const isNoSpend = challenge.type === 'no_spend';

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{challenge.title}</h3>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: typeBadge.color + '15', color: typeBadge.color }}
            >
              {typeBadge.label}
            </span>
            {challenge.duration === 'weekly' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">Weekly</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{challenge.description}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            isOnTrack ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {isOnTrack ? 'On Track' : 'Over'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        {isNoSpend ? (
          <span className="text-slate-400">
            {progress.noSpendDaysHit} / {progress.noSpendDaysTarget} no-spend days
          </span>
        ) : isSavings ? (
          <span className="text-slate-400">
            ${currentSpent.toFixed(2)} / ${targetAmount.toFixed(2)} saved
          </span>
        ) : (
          <span className="text-slate-400">
            ${currentSpent.toFixed(2)} / ${targetAmount.toFixed(2)} spent
          </span>
        )}
        <span className="text-slate-500">
          {daysRemaining > 0 ? `${daysRemaining}d left` : 'Expired'}
        </span>
      </div>

      {/* Abandon button */}
      {challenge.status === 'active' && (
        <div className="flex justify-end">
          <button
            onClick={handleAbandon}
            disabled={loading}
            className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors"
          >
            Abandon
          </button>
        </div>
      )}
    </div>
  );
}
