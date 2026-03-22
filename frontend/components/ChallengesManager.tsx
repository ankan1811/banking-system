"use client"

import { useState, useEffect } from 'react';
import { getChallengesOverview, getAiSuggestions, createChallenge } from '@/lib/api/challenges.api';
import type { ChallengesOverview, AiChallengeSuggestion } from '@shared/types';
import { AI_CATEGORIES } from '@shared/types';
import ChallengeProgressCard from './ChallengeProgressCard';
import BadgeIcon from './BadgeIcon';
import { Sparkles } from 'lucide-react';

export default function ChallengesManager({ bankRecordId }: { bankRecordId: string }) {
  const [overview, setOverview] = useState<ChallengesOverview | null>(null);
  const [suggestions, setSuggestions] = useState<AiChallengeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [suggestionsSource, setSuggestionsSource] = useState<'ai' | 'formula'>('formula');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'category_limit' as 'category_limit' | 'no_spend' | 'savings_target',
    category: 'Food & Dining',
    targetAmount: '',
    duration: 'monthly' as 'weekly' | 'monthly',
  });

  const load = () => {
    setLoading(true);
    getChallengesOverview(bankRecordId)
      .then((res) => setOverview(res.overview))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadSuggestions = () => {
    setSuggestionsLoading(true);
    getAiSuggestions(bankRecordId, false)
      .then((res) => {
        setSuggestions(res.suggestions);
        if (res.source) setSuggestionsSource(res.source);
      })
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  };

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    try {
      const res = await getAiSuggestions(bankRecordId, true);
      setSuggestions(res.suggestions);
      if (res.source) setSuggestionsSource(res.source);
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => { load(); loadSuggestions(); }, [bankRecordId]);

  const handleCreate = async () => {
    if (!form.title || !form.description) return;
    try {
      await createChallenge({
        title: form.title,
        description: form.description,
        type: form.type,
        category: form.type === 'category_limit' ? form.category : undefined,
        targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : undefined,
        duration: form.duration,
      });
      setCreating(false);
      setForm({ title: '', description: '', type: 'category_limit', category: 'Food & Dining', targetAmount: '', duration: 'monthly' });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const acceptSuggestion = async (s: AiChallengeSuggestion) => {
    try {
      await createChallenge({
        title: s.title,
        description: s.description,
        type: s.type,
        category: s.category || undefined,
        targetAmount: s.targetAmount || undefined,
        duration: s.duration,
        isAiGenerated: true,
      });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="glass-card p-5 animate-pulse">
          <div className="h-4 w-24 bg-slate-700/50 rounded mb-3" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="w-10 h-10 bg-slate-700/50 rounded-full" />)}
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-3 w-32 bg-slate-700/50 rounded mb-2" />
            <div className="h-2 bg-slate-700/50 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="glass-card p-6"><p className="text-sm text-slate-500">{error}</p></div>;
  if (!overview) return null;

  const { activeChallenges, streak, badges, history } = overview;

  return (
    <div className="space-y-4">
      {/* Streak & Badges */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-400">{streak.currentStreak}</p>
              <p className="text-[10px] text-slate-500">Streak</p>
            </div>
            <div className="w-px h-8 bg-slate-700/50" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">{streak.totalCompleted}</p>
              <p className="text-[10px] text-slate-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">{streak.longestStreak}</p>
              <p className="text-[10px] text-slate-500">Best Streak</p>
            </div>
          </div>
        </div>
        {badges.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {badges.map((b) => <BadgeIcon key={b.id} badgeType={b.badgeType} />)}
          </div>
        )}
        {badges.length === 0 && (
          <p className="text-xs text-slate-600">Complete challenges to earn badges!</p>
        )}
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs text-slate-500">Active Challenges</h3>
          {activeChallenges.map((p) => (
            <ChallengeProgressCard key={p.challenge.id} progress={p} onUpdate={load} />
          ))}
        </div>
      )}

      {activeChallenges.length === 0 && !creating && (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">No active challenges</p>
          <p className="text-xs text-slate-600">Accept an AI suggestion below or create your own!</p>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs text-slate-500">AI Suggestions</h3>
              {suggestionsSource === 'ai' ? (
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
              ) : suggestionsSource === 'ai' ? (
                <><Sparkles className="w-3 h-3" />Regenerate</>
              ) : (
                <><Sparkles className="w-3 h-3" />Generate with AI</>
              )}
            </button>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="glass-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 capitalize">
                    {s.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                    {s.duration}
                  </span>
                  {s.targetAmount && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                      ${s.targetAmount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => acceptSuggestion(s)}
                className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg text-xs flex-shrink-0"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestionsLoading && (
        <div className="glass-card p-5 animate-pulse">
          <div className="h-3 w-24 bg-slate-700/50 rounded mb-2" />
          <div className="h-2 w-48 bg-slate-700/50 rounded" />
        </div>
      )}

      {/* Create custom challenge */}
      {creating ? (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Challenge</h3>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Challenge title"
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (e.g. Cut dining spending by 20%)"
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />

          {/* Type selector */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Type</p>
            <div className="flex gap-1">
              {([
                { value: 'category_limit', label: 'Budget Limit' },
                { value: 'no_spend', label: 'No-Spend' },
                { value: 'savings_target', label: 'Savings' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    form.type === t.value ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {form.type === 'category_limit' && (
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                {AI_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <input
              type="number"
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              placeholder={form.type === 'no_spend' ? 'Target no-spend days' : 'Target amount ($)'}
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Duration */}
          <div className="flex gap-1">
            {(['weekly', 'monthly'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setForm({ ...form, duration: d })}
                className={`px-3 py-1.5 rounded text-xs capitalize transition-colors ${
                  form.duration === d ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm">
              Start Challenge
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full text-sm text-slate-500 hover:text-violet-400 border border-dashed border-slate-700/50 hover:border-violet-500/30 rounded-xl py-3 transition-colors"
        >
          + Create custom challenge
        </button>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 mb-2">Challenge History</h3>
          <div className="space-y-1.5">
            {history.map((c) => (
              <div key={c.id} className="glass-card p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{c.title}</p>
                  <p className="text-[10px] text-slate-600">{c.duration} &middot; {new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                  c.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  c.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                  'bg-slate-700/50 text-slate-500'
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
