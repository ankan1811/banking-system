"use client"

import { useState } from 'react';
import { settleParticipant, deleteSplit } from '@/lib/api/splits.api';
import type { SplitGroup } from '@shared/types';
import ConfirmModal from './ConfirmModal';

export default function SplitCard({ split, onUpdate }: { split: SplitGroup; onUpdate: () => void }) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const paidCount = split.participants.filter((p) => p.isPaid).length;
  const totalParticipants = split.participants.length;
  const paidPercent = totalParticipants > 0 ? (paidCount / totalParticipants) * 100 : 0;

  const handleToggle = async (participantId: string, currentPaid: boolean) => {
    setTogglingId(participantId);
    try {
      await settleParticipant(split.id, participantId, !currentPaid);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSplit(split.id);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const isSettled = split.status === 'settled';
  const dateStr = new Date(split.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className={`glass-card p-5 space-y-3 ${isSettled ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{split.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{dateStr} &middot; {split.splitType} split</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">${Number(split.totalAmount).toFixed(2)}</p>
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
          {split.participants.map((p) => {
            const isToggling = togglingId === p.id;
            return (
              <div key={p.id} className={`flex items-center justify-between gap-2 py-1 ${isToggling ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => handleToggle(p.id, p.isPaid)}
                    disabled={togglingId !== null || deleting}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      p.isPaid
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-600 hover:border-violet-500/50'
                    }`}
                  >
                    {isToggling ? (
                      <svg className="w-2.5 h-2.5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : p.isPaid ? (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-xs truncate ${p.isPaid ? 'text-slate-500 line-through' : 'text-white'}`}>{p.name}</p>
                    <p className="text-[10px] text-slate-600 truncate">{p.email}</p>
                  </div>
                </div>
                <p className={`text-xs font-medium flex-shrink-0 ${p.isPaid ? 'text-emerald-400' : 'text-slate-300'}`}>
                  ${Number(p.amount).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Delete */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting || togglingId !== null}
            className="text-[10px] text-slate-600 hover:text-rose-400 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete this split?"
        description={`"${split.title}" and all participant data will be permanently removed.`}
        confirmText="Delete"
        confirmingText="Deleting"
      />
    </>
  );
}
