"use client"

import { useState, useEffect } from 'react';
import { getAlerts, createAlert, updateAlert, deleteAlert } from '@/lib/api/alerts.api';
import { AI_CATEGORIES } from '@shared/types';
import type { AlertRule, AICategory } from '@shared/types';

const ALERT_TYPE_LABELS: Record<AlertRule['type'], string> = {
  category_monthly_limit: 'Monthly category spend exceeds',
  single_transaction: 'Single transaction exceeds',
  balance_below: 'Balance falls below',
};

export default function AlertsManager() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{
    type: AlertRule['type'];
    threshold: string;
    category: AICategory;
  }>({
    type: 'category_monthly_limit',
    threshold: '',
    category: AI_CATEGORIES[0],
  });

  const load = () => {
    setLoading(true);
    getAlerts()
      .then((res) => setAlerts(res.alerts))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const threshold = parseFloat(form.threshold);
    if (!threshold || threshold <= 0) return;
    await createAlert({
      type: form.type,
      threshold,
      category: form.type === 'category_monthly_limit' ? form.category : undefined,
    });
    setCreating(false);
    setForm({ type: 'category_monthly_limit', threshold: '', category: AI_CATEGORIES[0] });
    load();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await updateAlert(id, { enabled: !enabled });
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteAlert(id);
    load();
  };

  const renderAlertDescription = (a: AlertRule) => {
    const label = ALERT_TYPE_LABELS[a.type];
    const threshold = `$${a.threshold.toFixed(2)}`;
    if (a.type === 'category_monthly_limit' && a.category) {
      return `${label} ${threshold} in ${a.category}`;
    }
    return `${label} ${threshold}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-3 w-48 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.length === 0 && !creating && (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">No alert rules yet.</p>
          <p className="text-xs text-slate-600">Get notified by email when spending thresholds are reached.</p>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`glass-card p-4 flex items-center justify-between gap-3 transition-opacity ${
              !a.enabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg shrink-0">
                {a.type === 'category_monthly_limit' ? '📊' : a.type === 'single_transaction' ? '💳' : '🏦'}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{renderAlertDescription(a)}</p>
                <p className="text-xs text-slate-500">Email alert · {a.enabled ? 'Active' : 'Disabled'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(a.id, a.enabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  a.enabled ? 'bg-violet-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    a.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-slate-600 hover:text-rose-400 text-sm transition-colors"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {creating ? (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Alert Rule</h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Alert type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AlertRule['type'] })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
            >
              <option value="category_monthly_limit">Monthly category spend exceeds</option>
              <option value="single_transaction">Single transaction exceeds</option>
              <option value="balance_below">Balance falls below</option>
            </select>
          </div>

          {form.type === 'category_monthly_limit' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AICategory })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                {AI_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1">Threshold ($)</label>
            <input
              type="number"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              placeholder="e.g. 200"
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm"
            >
              Create Alert
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
          + Add alert rule
        </button>
      )}
    </div>
  );
}
