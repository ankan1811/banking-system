"use client"

import { useState, useEffect } from 'react';
import {
  getNetWorth, createManualAsset, deleteManualAsset, updateManualAsset,
  createManualLiability, deleteManualLiability, updateManualLiability,
} from '@/lib/api/net-worth.api';
import type { NetWorthData } from '@shared/types';
import { ASSET_CATEGORIES, LIABILITY_CATEGORIES } from '@shared/types';
import NetWorthChart from './NetWorthChart';
import AssetLiabilityRow from './AssetLiabilityRow';
import { Sparkles } from 'lucide-react';

export default function NetWorthManager() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(12);
  const [tab, setTab] = useState<'overview' | 'assets' | 'liabilities'>('overview');
  const [addingAsset, setAddingAsset] = useState(false);
  const [addingLiability, setAddingLiability] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: '', category: 'property', value: '', notes: '' });
  const [liabilityForm, setLiabilityForm] = useState({ name: '', category: 'mortgage', value: '', notes: '' });
  const [aiInsightSource, setAiInsightSource] = useState<'ai' | 'formula' | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    getNetWorth(months, false)
      .then((res) => {
        setData(res.data);
        if (res.data?.aiInsightSource) setAiInsightSource(res.data.aiInsightSource);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [months]);

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    try {
      const res = await getNetWorth(months, true);
      setData(res.data);
      if (res.data?.aiInsightSource) setAiInsightSource(res.data.aiInsightSource);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!assetForm.name || !assetForm.value) return;
    await createManualAsset({
      name: assetForm.name,
      category: assetForm.category,
      value: parseFloat(assetForm.value),
      notes: assetForm.notes || undefined,
    });
    setAddingAsset(false);
    setAssetForm({ name: '', category: 'property', value: '', notes: '' });
    load();
  };

  const handleCreateLiability = async () => {
    if (!liabilityForm.name || !liabilityForm.value) return;
    await createManualLiability({
      name: liabilityForm.name,
      category: liabilityForm.category,
      value: parseFloat(liabilityForm.value),
      notes: liabilityForm.notes || undefined,
    });
    setAddingLiability(false);
    setLiabilityForm({ name: '', category: 'mortgage', value: '', notes: '' });
    load();
  };

  const handleDeleteAsset = async (id: string) => {
    await deleteManualAsset(id);
    load();
  };

  const handleDeleteLiability = async (id: string) => {
    await deleteManualLiability(id);
    load();
  };

  const handleUpdateAsset = async (id: string, updates: any) => {
    await updateManualAsset(id, updates);
    load();
  };

  const handleUpdateLiability = async (id: string, updates: any) => {
    await updateManualLiability(id, updates);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-5 w-16 bg-slate-700/50 rounded mb-2" />
              <div className="h-2 w-20 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 animate-pulse"><div className="h-56 bg-slate-700/30 rounded" /></div>
      </div>
    );
  }

  if (error) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error}</p></div>;
  if (!data) return null;

  const { current, breakdown, history, aiInsight } = data;
  const changeColor = current.monthlyChange >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const changeArrow = current.monthlyChange >= 0 ? '+' : '';

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-lg font-bold text-emerald-400">
            ${current.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Total Assets</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-lg font-bold text-rose-400">
            ${current.totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Total Liabilities</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-lg font-bold text-violet-400">
            ${current.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Net Worth</p>
        </div>
        <div className="glass-card p-4">
          <p className={`text-lg font-bold ${changeColor}`}>
            {changeArrow}${Math.abs(current.monthlyChange).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Monthly Change ({changeArrow}{Number(current.monthlyChangePercent).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Chart */}
      <NetWorthChart history={history} months={months} onMonthsChange={setMonths} />

      {/* Tabs */}
      <div className="flex gap-1">
        {(['overview', 'assets', 'liabilities'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-xs transition-colors capitalize ${
              tab === t ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Linked accounts */}
          {breakdown.linkedAccounts.length > 0 && (
            <div className="glass-card p-5">
              <h4 className="text-xs text-slate-500 mb-3">Linked Bank Accounts</h4>
              {breakdown.linkedAccounts.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-white">{a.name}</span>
                  <span className="text-sm font-medium text-emerald-400">
                    ${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Manual assets */}
          {breakdown.manualAssets.length > 0 && (
            <div className="glass-card p-5">
              <h4 className="text-xs text-slate-500 mb-3">Manual Assets</h4>
              {breakdown.manualAssets.map((a, i) => (
                <AssetLiabilityRow key={i} item={{ ...a, id: String(i), notes: null }} type="asset" onDelete={() => {}} onUpdate={() => {}} />
              ))}
            </div>
          )}

          {/* Liabilities */}
          {breakdown.liabilities.length > 0 && (
            <div className="glass-card p-5">
              <h4 className="text-xs text-slate-500 mb-3">Liabilities</h4>
              {breakdown.liabilities.map((l, i) => (
                <AssetLiabilityRow key={i} item={{ ...l, id: String(i), notes: null }} type="liability" onDelete={() => {}} onUpdate={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'assets' && (
        <div className="glass-card p-5 space-y-3">
          <h4 className="text-xs text-slate-500">Manual Assets</h4>
          {breakdown.manualAssets.length > 0 ? (
            breakdown.manualAssets.map((a, i) => (
              <AssetLiabilityRow
                key={a.name + i}
                item={{ id: (data as any)?._assetIds?.[i] || String(i), ...a, notes: null }}
                type="asset"
                onDelete={handleDeleteAsset}
                onUpdate={handleUpdateAsset}
              />
            ))
          ) : (
            <p className="text-xs text-slate-600 py-2">No manual assets added yet.</p>
          )}

          {addingAsset ? (
            <div className="space-y-2 pt-2 border-t border-slate-700/30">
              <input
                type="text"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="Asset name (e.g. House)"
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
              />
              <div className="flex gap-2">
                <select
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                >
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={assetForm.value}
                  onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                  placeholder="Value ($)"
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateAsset} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm">Add</button>
                <button onClick={() => setAddingAsset(false)} className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingAsset(true)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Add asset
            </button>
          )}
        </div>
      )}

      {tab === 'liabilities' && (
        <div className="glass-card p-5 space-y-3">
          <h4 className="text-xs text-slate-500">Liabilities</h4>
          {breakdown.liabilities.length > 0 ? (
            breakdown.liabilities.map((l, i) => (
              <AssetLiabilityRow
                key={l.name + i}
                item={{ id: (data as any)?._liabilityIds?.[i] || String(i), ...l, notes: null }}
                type="liability"
                onDelete={handleDeleteLiability}
                onUpdate={handleUpdateLiability}
              />
            ))
          ) : (
            <p className="text-xs text-slate-600 py-2">No liabilities added yet.</p>
          )}

          {addingLiability ? (
            <div className="space-y-2 pt-2 border-t border-slate-700/30">
              <input
                type="text"
                value={liabilityForm.name}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })}
                placeholder="Liability name (e.g. Car Loan)"
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
              />
              <div className="flex gap-2">
                <select
                  value={liabilityForm.category}
                  onChange={(e) => setLiabilityForm({ ...liabilityForm, category: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                >
                  {LIABILITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={liabilityForm.value}
                  onChange={(e) => setLiabilityForm({ ...liabilityForm, value: e.target.value })}
                  placeholder="Amount ($)"
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateLiability} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm">Add</button>
                <button onClick={() => setAddingLiability(false)} className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingLiability(true)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Add liability
            </button>
          )}
        </div>
      )}

      {/* AI Insight */}
      {aiInsight && (
        <div className="glass-card p-5 border-violet-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">AI</span>
              {aiInsightSource === 'ai' ? (
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
              ) : aiInsightSource === 'ai' ? (
                <><Sparkles className="w-3 h-3" />Regenerate</>
              ) : (
                <><Sparkles className="w-3 h-3" />Generate with AI</>
              )}
            </button>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{aiInsight}</p>
        </div>
      )}
    </div>
  );
}
