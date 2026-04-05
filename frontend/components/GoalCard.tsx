"use client"

import { useState } from 'react';
import type { SavingsGoal } from '@shared/types';
import { Trash2 } from 'lucide-react';
import { addContribution, deleteGoal, updateGoal } from '@/lib/api/goals.api';
import { IconRenderer } from '@/lib/iconMap';
import ConfirmModal from './ConfirmModal';

interface Props {
  goal: SavingsGoal;
  onUpdate: () => void;
}

export default function GoalCard({ goal, onUpdate }: Props) {
  const [contributing, setContributing] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const target = goal.targetAmount;
  const saved = goal.savedAmount;
  const pct = Math.min((saved / target) * 100, 100);
  const color = goal.color || '#8b5cf6';

  // SVG ring
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  const handleContribute = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    try {
      await addContribution(goal.id, val, note || undefined);
      setContributing(false);
      setAmount('');
      setNote('');
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const handleAbandon = async () => {
    await updateGoal(goal.id, { status: 'abandoned' });
    setShowAbandonModal(false);
    onUpdate();
  };

  const handleDelete = async () => {
    await deleteGoal(goal.id);
    setShowDeleteModal(false);
    onUpdate();
  };

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <div className="glass-card p-5 flex flex-col gap-4">
        {/* Top row: ring + info */}
        <div className="flex items-center gap-4">
          {/* SVG progress ring */}
          <div className="relative shrink-0">
            <svg width={88} height={88} className="-rotate-90">
              <circle
                cx={44} cy={44} r={radius}
                fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={8}
              />
              <circle
                cx={44} cy={44} r={radius}
                fill="none"
                stroke={goal.status === 'completed' ? '#10b981' : color}
                strokeWidth={8}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center">
              <IconRenderer name={goal.emoji} size={24} className="text-slate-200" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-white truncate">{goal.name}</h3>
              {goal.status === 'completed' && (
                <span className="shrink-0 text-xs text-emerald-400 font-medium">✓ Done</span>
              )}
              {goal.status === 'abandoned' && (
                <span className="shrink-0 text-xs text-slate-500 font-medium">Abandoned</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              <span className="text-white font-medium">${Number(saved).toFixed(2)}</span>
              {' '}of{' '}
              <span className="text-slate-300">${Number(target).toFixed(2)}</span>
              {' '}({pct.toFixed(0)}%)
            </p>
            {daysLeft !== null && (
              <p className="text-xs mt-0.5" style={{ color: daysLeft < 30 ? '#f59e0b' : '#64748b' }}>
                {daysLeft > 0 ? `${daysLeft} days left` : 'Target date passed'}
              </p>
            )}
          </div>

          {/* Actions */}
          {goal.status === 'active' && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setContributing(!contributing)}
                className="px-2.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg text-xs transition-colors"
              >
                + Add
              </button>
              <button
                onClick={() => setShowAbandonModal(true)}
                className="p-1.5 text-slate-600 hover:text-slate-400 rounded"
                title="Abandon"
              >
                ✕
              </button>
            </div>
          )}
          {goal.status !== 'active' && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 text-slate-700 hover:text-rose-400 rounded text-xs"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Contribution form */}
        {contributing && (
          <div className="border-t border-slate-700/50 pt-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount ($)"
                className="flex-1 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
              />
              <button
                onClick={handleContribute}
                disabled={loading}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm"
              >
                {loading ? '...' : 'Save'}
              </button>
              <button
                onClick={() => setContributing(false)}
                className="px-2 py-1.5 text-slate-500 hover:text-slate-300 text-sm"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        )}
      </div>

      <ConfirmModal
        open={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        onConfirm={handleAbandon}
        title="Abandon this goal?"
        description={`"${goal.name}" will be marked as abandoned. You can delete it later.`}
        confirmText="Abandon"
        confirmingText="Abandoning"
        icon={
          <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        }
      />

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete this goal?"
        description={`"${goal.name}" will be permanently removed along with all contributions.`}
        confirmText="Delete"
        confirmingText="Deleting"
      />
    </>
  );
}
