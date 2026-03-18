import { getAccount } from './bank.service.js';
import type { AICategory, TrendsData, RecurringPattern } from '@shared/types';
import { AI_CATEGORIES } from '@shared/types';

// ─── In-memory caches ────────────────────────────────────────
const trendsCache = new Map<string, { data: TrendsData; expiresAt: number }>();
const recurringCache = new Map<string, { data: RecurringPattern[]; expiresAt: number }>();
const TRENDS_TTL = 5 * 60 * 1000;
const RECURRING_TTL = 60 * 60 * 1000;

// ─── Spending Trends ─────────────────────────────────────────

export async function getSpendingTrends(bankRecordId: string, months: number): Promise<TrendsData> {
  const cacheKey = `${bankRecordId}:${months}`;
  const cached = trendsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { transactions } = await getAccount(bankRecordId);

  // Generate last N months labels
  const monthLabels: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Aggregate spending by month + category
  const data: Record<string, number[]> = {};
  const totals: number[] = new Array(months).fill(0);

  for (const t of transactions) {
    if (t.amount <= 0) continue; // skip credits
    const date: string = t.date || t.createdAt;
    const monthStr = typeof date === 'string' ? date.slice(0, 7) : new Date(date).toISOString().slice(0, 7);
    const monthIdx = monthLabels.indexOf(monthStr);
    if (monthIdx === -1) continue;

    const category: string = (t as any).aiCategory || t.category || 'Other';
    if (!data[category]) data[category] = new Array(months).fill(0);
    const amt = Math.abs(t.amount);
    data[category][monthIdx] = Math.round((data[category][monthIdx] + amt) * 100) / 100;
    totals[monthIdx] = Math.round((totals[monthIdx] + amt) * 100) / 100;
  }

  // Only include AI categories that have data
  const usedCategories = AI_CATEGORIES.filter((c) => data[c] && data[c].some((v) => v > 0));

  const result: TrendsData = {
    months: monthLabels,
    categories: usedCategories,
    data: Object.fromEntries(usedCategories.map((c) => [c, data[c] || new Array(months).fill(0)])),
    totals,
  };

  trendsCache.set(cacheKey, { data: result, expiresAt: Date.now() + TRENDS_TTL });
  return result;
}

// ─── Recurring Transaction Detection ─────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function detectRecurring(bankRecordId: string): Promise<RecurringPattern[]> {
  const cacheKey = bankRecordId;
  const cached = recurringCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const { transactions } = await getAccount(bankRecordId);

  // Group debits by normalized merchant name
  const groups = new Map<string, { name: string; amounts: number[]; dates: string[]; category: string }>();

  for (const t of transactions) {
    if (t.amount <= 0) continue; // skip credits
    const key = normalizeName((t as any).merchantName || t.name || '');
    if (!key) continue;

    if (!groups.has(key)) {
      groups.set(key, {
        name: (t as any).merchantName || t.name,
        amounts: [],
        dates: [],
        category: (t as any).aiCategory || t.category || 'Other',
      });
    }
    const g = groups.get(key)!;
    g.amounts.push(Math.abs(t.amount));
    g.dates.push(t.date || new Date(t.createdAt).toISOString().slice(0, 10));
  }

  const patterns: RecurringPattern[] = [];

  for (const [, group] of groups) {
    if (group.dates.length < 3) continue;

    // Sort dates
    const sortedDates = [...group.dates].sort();
    const medianAmt = median(group.amounts);

    // Check amount consistency (all within 10% of median)
    const allClose = group.amounts.every((a) => Math.abs(a - medianAmt) / medianAmt <= 0.10);
    if (!allClose) continue;

    // Compute gaps between consecutive dates
    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(diff);
    }

    const medianGap = median(gaps);
    const gapVariance = Math.max(...gaps) - Math.min(...gaps);

    // Classify frequency by median gap
    let frequency: RecurringPattern['frequency'] | null = null;
    if (medianGap >= 6 && medianGap <= 8 && gapVariance <= 3) frequency = 'weekly';
    else if (medianGap >= 25 && medianGap <= 35 && gapVariance <= 7) frequency = 'monthly';
    else if (medianGap >= 88 && medianGap <= 95 && gapVariance <= 10) frequency = 'quarterly';

    if (!frequency) continue;

    const lastCharged = sortedDates[sortedDates.length - 1];
    const nextExpected = addDays(lastCharged, Math.round(medianGap));

    patterns.push({
      name: group.name,
      normalizedAmount: Math.round(medianAmt * 100) / 100,
      frequency,
      lastCharged,
      nextExpected,
      category: group.category,
      occurrences: sortedDates.length,
    });
  }

  // Sort by amount desc
  patterns.sort((a, b) => b.normalizedAmount - a.normalizedAmount);

  recurringCache.set(cacheKey, { data: patterns, expiresAt: Date.now() + RECURRING_TTL });
  return patterns;
}
