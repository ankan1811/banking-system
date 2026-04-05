"use client"

import { useState, useEffect } from 'react';
import { Wallet, PieChart, ShieldAlert, X, Trash2, Plus } from 'lucide-react';
import { getBudgetStatus, upsertBudget, deleteBudget } from '@/lib/api/budgets.api';
import { aiCategoryColors } from '@/constants';
import { AI_CATEGORIES } from '@shared/types';
import type { BudgetStatus, AICategory } from '@shared/types';

export default function BudgetProgressCard() {
  const [statuses, setStatuses] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState<AICategory>(AI_CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7);

  const load = () => {
    setLoading(true);
    getBudgetStatus(currentMonth)
      .then((res) => setStatuses(res.statuses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSaveEdit = async (category: string, budgetId: string | null) => {
    const limit = parseFloat(editValue);
    if (!limit || limit <= 0) return;
    await upsertBudget(category, limit, currentMonth);
    setEditingCategory(null);
    load();
  };

  const handleDelete = async (budgetId: string) => {
    await deleteBudget(budgetId);
    load();
  };

  const handleAddNew = async () => {
    const limit = parseFloat(newLimit);
    if (!limit || limit <= 0) return;
    await upsertBudget(newCategory, limit, currentMonth);
    setAddingNew(false);
    setNewLimit('');
    load();
  };

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-32 bg-slate-700/50 rounded" />
            <div className="h-2 w-full bg-slate-700/50 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error}</p></div>;
  }

  const budgetedCategories = new Set(statuses.filter((s) => s.budgetId).map((s) => s.category));
  const availableToAdd = AI_CATEGORIES.filter((c) => !budgetedCategories.has(c));

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Monthly Budgets</h3>
        <span className="text-xs text-slate-400">{currentMonth}</span>
      </div>

      {statuses.length === 0 && !addingNew && (
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Wallet size={20} className="text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">No budgets set yet</h3>
            <p className="text-xs text-slate-500">Set monthly spending limits for each category and track your progress.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
              <Wallet size={20} className="text-violet-400 mx-auto" />
              <p className="text-[11px] text-slate-400 mt-1">Category limits</p>
              <p className="text-[10px] text-slate-500">Set a cap per spending category</p>
            </div>
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
              <PieChart size={20} className="text-violet-400 mx-auto" />
              <p className="text-[11px] text-slate-400 mt-1">Track progress</p>
              <p className="text-[10px] text-slate-500">See how much you've spent vs limit</p>
            </div>
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
              <ShieldAlert size={20} className="text-violet-400 mx-auto" />
              <p className="text-[11px] text-slate-400 mt-1">Over-budget warnings</p>
              <p className="text-[10px] text-slate-500">Visual alerts when you exceed limits</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {statuses.map((s) => {
          const color = aiCategoryColors[s.category] || '#78716c';
          const pct = Math.min(s.percentUsed || 0, 100);
          const isOver = (s.percentUsed || 0) >= 100;
          const isWarn = (s.percentUsed || 0) >= 75 && !isOver;
          const barColor = isOver ? '#ef4444' : isWarn ? '#f59e0b' : color;

          return (
            <div key={s.category}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-300">{s.category}</span>
                  {isOver && <span className="text-rose-400 font-medium">Over budget!</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">
                    ${Number(s.spent).toFixed(2)}
                    {s.monthlyLimit !== null && ` / $${Number(s.monthlyLimit).toFixed(2)}`}
                  </span>
                  {s.budgetId ? (
                    <>
                      {editingCategory === s.category ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-1.5 py-0.5 bg-slate-700 rounded text-white text-xs"
                            placeholder="Limit $"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(s.category, s.budgetId)}
                            className="text-emerald-400 hover:text-emerald-300 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="text-slate-500 hover:text-slate-400 text-xs"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingCategory(s.category); setEditValue(String(s.monthlyLimit || '')); }}
                            className="text-slate-500 hover:text-slate-300 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s.budgetId!)}
                            className="text-slate-600 hover:text-rose-400 text-xs"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingCategory(s.category); setEditValue(''); setAddingNew(false); }}
                      className="text-slate-500 hover:text-violet-400 text-xs"
                    >
                      <Plus size={12} className="inline" /> Set budget
                    </button>
                  )}
                </div>
              </div>

              {s.monthlyLimit !== null && (
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              )}

              {/* Inline edit for categories without budget but with spending */}
              {editingCategory === s.category && !s.budgetId && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-700 rounded text-white text-xs"
                    placeholder="Monthly limit ($)"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(s.category, null)}
                    className="px-2 py-1 bg-violet-600 hover:bg-violet-500 rounded text-white text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="text-slate-500 hover:text-slate-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new budget */}
      {addingNew ? (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as AICategory)}
            className="flex-1 px-2 py-1.5 bg-slate-700 rounded text-white text-xs"
          >
            {availableToAdd.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            className="w-24 px-2 py-1.5 bg-slate-700 rounded text-white text-xs"
            placeholder="Limit $"
          />
          <button
            onClick={handleAddNew}
            className="px-2 py-1.5 bg-violet-600 hover:bg-violet-500 rounded text-white text-xs"
          >
            Add
          </button>
          <button
            onClick={() => setAddingNew(false)}
            className="text-slate-500 hover:text-slate-400 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        availableToAdd.length > 0 && (
          <button
            onClick={() => setAddingNew(true)}
            className="w-full text-xs text-slate-500 hover:text-violet-400 border border-dashed border-slate-700/50 hover:border-violet-500/30 rounded-lg py-2 transition-colors"
          >
            <Plus size={12} className="inline" /> Add budget for a category
          </button>
        )
      )}
    </div>
  );
}
