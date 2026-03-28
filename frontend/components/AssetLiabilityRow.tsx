"use client"

import { useState } from 'react';

type Item = {
  id: string;
  name: string;
  category: string;
  value: number;
  notes: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  property: 'Property',
  vehicle: 'Vehicle',
  investment: 'Investment',
  cash: 'Cash',
  mortgage: 'Mortgage',
  auto_loan: 'Auto Loan',
  student_loan: 'Student Loan',
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  property: '#8b5cf6',
  vehicle: '#06b6d4',
  investment: '#22c55e',
  cash: '#f59e0b',
  mortgage: '#ef4444',
  auto_loan: '#f43f5e',
  student_loan: '#ec4899',
  credit_card: '#f97316',
  personal_loan: '#6366f1',
  other: '#64748b',
};

export default function AssetLiabilityRow({
  item,
  type,
  onDelete,
  onUpdate,
}: {
  item: Item;
  type: 'asset' | 'liability';
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Item>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: item.name, value: String(item.value) });

  const handleSave = () => {
    if (!form.name || !form.value) return;
    onUpdate(item.id, { name: form.name, value: parseFloat(form.value) });
    setEditing(false);
  };

  const color = CATEGORY_COLORS[item.category] || '#64748b';

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="flex-1 px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-white text-xs focus:outline-none focus:border-violet-500/50"
        />
        <input
          type="number"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          className="w-24 px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-white text-xs focus:outline-none focus:border-violet-500/50"
        />
        <button onClick={handleSave} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 group">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-white truncate">{item.name}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: color + '15', color }}
        >
          {CATEGORY_LABELS[item.category] || item.category}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-medium ${type === 'asset' ? 'text-emerald-400' : 'text-rose-400'}`}>
          ${Number(item.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="text-[10px] text-slate-500 hover:text-violet-400">Edit</button>
          <button onClick={() => onDelete(item.id)} className="text-[10px] text-slate-500 hover:text-rose-400">Del</button>
        </div>
      </div>
    </div>
  );
}
