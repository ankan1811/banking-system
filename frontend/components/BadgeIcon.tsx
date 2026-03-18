"use client"

import type { BadgeType } from '@shared/types';

const BADGE_CONFIG: Record<BadgeType, { emoji: string; label: string; color: string }> = {
  first_challenge: { emoji: '1st', label: 'First Challenge', color: '#f59e0b' },
  streak_3: { emoji: '3x', label: '3 Streak', color: '#f97316' },
  streak_7: { emoji: '7x', label: '7 Streak', color: '#ef4444' },
  streak_30: { emoji: '30', label: '30 Streak', color: '#dc2626' },
  five_completed: { emoji: '5+', label: '5 Completed', color: '#8b5cf6' },
  ten_completed: { emoji: '10', label: '10 Completed', color: '#6366f1' },
  perfect_month: { emoji: 'PM', label: 'Perfect Month', color: '#10b981' },
  savings_hero: { emoji: 'SH', label: 'Savings Hero', color: '#22c55e' },
};

export default function BadgeIcon({ badgeType }: { badgeType: BadgeType }) {
  const config = BADGE_CONFIG[badgeType] || { emoji: '?', label: badgeType, color: '#64748b' };

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      title={config.label}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: config.color + '30', border: `2px solid ${config.color}` }}
      >
        {config.emoji}
      </div>
      <span className="text-[8px] text-slate-500 text-center leading-tight">{config.label}</span>
    </div>
  );
}
