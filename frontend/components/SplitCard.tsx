"use client"

import { useState } from 'react';
import { settleParticipant, deleteSplit } from '@/lib/api/splits.api';
import type { SplitGroup } from '@shared/types';

export default function SplitCard({ split, onUpdate }: { split: SplitGroup; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);

  const paidCount = split.participants.filter((p) => p.isPaid).length;
  const totalParticipants = split.participants.length;
  const paidPercent = totalParticipants > 0 ? (paidCount / totalParticipants) * 100 : 0;

  const handleToggle = async (participantId: string, currentPaid: boolean) => {
    setLoading(true);
    try {
      await settleParticipant(split.id, participantId, !currentPaid);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this split?')) return;
    setLoading(true);
    try {
      await deleteSplit(split.id);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isSettled = split.status === 'settled';
  const dateStr = new Date(split.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={`glass-card p-5 space-y-3 ${isSettled ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{split.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{dateStr} &middot; {split.splitType} split</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">${split.totalAmount.toFixed(2)}</p>
          {isSettled ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Settled</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Pending</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${paidPercent}%`, backgroundColor: isSettled ? '#10b981' : '#8b5cf6' }}
        />
      </div>
      <p className="text-[10px] text-slate-500">{paidCount}/{totalParticipants} paid</p>

      {/* Participants */}
      <div className="space-y-1.5">
        {split.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => handleToggle(p.id, p.isPaid)}
                disabled={loading}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  p.isPaid
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-600 hover:border-violet-500/50'
                }`}
              >
                {p.isPaid && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="min-w-0">
                <p className={`text-xs truncate ${p.isPaid ? 'text-slate-500 line-through' : 'text-white'}`}>{p.name}</p>
                <p className="text-[10px] text-slate-600 truncate">{p.email}</p>
              </div>
            </div>
            <p className={`text-xs font-medium flex-shrink-0 ${p.isPaid ? 'text-emerald-400' : 'text-slate-300'}`}>
              ${p.amount.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
