import { getAccount } from './bank.service.js';
import { redisGet, redisSet } from '../lib/redis.js';
import type { AICategory, TrendsData, RecurringPattern, IncomeExpenseData, MerchantInsight } from '@shared/types';
import { AI_CATEGORIES } from '@shared/types';

const ANALYTICS_TTL_S = 24 * 60 * 60; // 24 hours in seconds

// ─── Spending Trends ─────────────────────────────────────────

export async function getSpendingTrends(bankRecordId: string, months: number): Promise<TrendsData> {
  const cacheKey = `trends:${bankRecordId}:${months}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as TrendsData;

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

  await redisSet(cacheKey, JSON.stringify(result), ANALYTICS_TTL_S);
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
  const cacheKey = `recurring:${bankRecordId}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as RecurringPattern[];

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

  await redisSet(cacheKey, JSON.stringify(patterns), ANALYTICS_TTL_S);
  return patterns;
}

// ─── Income vs Expense Report ────────────────────────────────

function generateMonthLabels(months: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return labels;
}

export async function getIncomeVsExpense(bankRecordId: string, months: number): Promise<IncomeExpenseData> {
  const cacheKey = `income-expense:${bankRecordId}:${months}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as IncomeExpenseData;

  const { transactions } = await getAccount(bankRecordId);
  const monthLabels = generateMonthLabels(months);

  const income: number[] = new Array(months).fill(0);
  const expenses: number[] = new Array(months).fill(0);
  const expensesByCategory: Record<string, number[]> = {};

  for (const t of transactions) {
    const date: string = t.date || t.createdAt;
    const monthStr = typeof date === 'string' ? date.slice(0, 7) : new Date(date).toISOString().slice(0, 7);
    const monthIdx = monthLabels.indexOf(monthStr);
    if (monthIdx === -1) continue;

    const amt = Math.abs(t.amount);
    const cat: string = (t as any).aiCategory || t.category || 'Other';

    if (t.amount < 0 || cat === 'Income') {
      income[monthIdx] = Math.round((income[monthIdx] + amt) * 100) / 100;
    } else {
      expenses[monthIdx] = Math.round((expenses[monthIdx] + amt) * 100) / 100;
      if (!expensesByCategory[cat]) expensesByCategory[cat] = new Array(months).fill(0);
      expensesByCategory[cat][monthIdx] = Math.round((expensesByCategory[cat][monthIdx] + amt) * 100) / 100;
    }
  }

  const net = monthLabels.map((_, i) => Math.round((income[i] - expenses[i]) * 100) / 100);
  const totalIncome = income.reduce((s, v) => s + v, 0);
  const totalExpenses = expenses.reduce((s, v) => s + v, 0);

  const result: IncomeExpenseData = {
    months: monthLabels,
    income,
    expenses,
    net,
    expensesByCategory,
    totals: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalNet: Math.round((totalIncome - totalExpenses) * 100) / 100,
      avgMonthlyNet: Math.round(((totalIncome - totalExpenses) / months) * 100) / 100,
    },
  };

  await redisSet(cacheKey, JSON.stringify(result), ANALYTICS_TTL_S);
  return result;
}

// ─── Merchant Insights ───────────────────────────────────────

export async function getMerchantInsights(bankRecordId: string, months: number): Promise<MerchantInsight[]> {
  const cacheKey = `merchants:${bankRecordId}:${months}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as MerchantInsight[];

  const { transactions } = await getAccount(bankRecordId);
  const monthLabels = generateMonthLabels(months);
  const currentMonth = monthLabels[monthLabels.length - 1];
  const prevMonth = monthLabels.length >= 2 ? monthLabels[monthLabels.length - 2] : null;

  // Group by normalized merchant name
  const groups = new Map<string, {
    name: string;
    totalSpent: number;
    count: number;
    categories: Map<string, number>;
    lastDate: string;
    monthlyAmounts: Record<string, number>;
  }>();

  for (const t of transactions) {
    if (t.amount <= 0) continue; // debits only
    const date: string = t.date || t.createdAt;
    const monthStr = typeof date === 'string' ? date.slice(0, 7) : new Date(date).toISOString().slice(0, 7);
    if (!monthLabels.includes(monthStr)) continue;

    const key = normalizeName((t as any).merchantName || t.name || '');
    if (!key) continue;

    const cat: string = (t as any).aiCategory || t.category || 'Other';
    const amt = Math.abs(t.amount);

    if (!groups.has(key)) {
      groups.set(key, {
        name: (t as any).merchantName || t.name,
        totalSpent: 0,
        count: 0,
        categories: new Map(),
        lastDate: date,
        monthlyAmounts: {},
      });
    }
    const g = groups.get(key)!;
    g.totalSpent += amt;
    g.count++;
    g.categories.set(cat, (g.categories.get(cat) || 0) + 1);
    if (date > g.lastDate) g.lastDate = date;
    g.monthlyAmounts[monthStr] = (g.monthlyAmounts[monthStr] || 0) + amt;
  }

  const merchants: MerchantInsight[] = [];
  for (const [, g] of groups) {
    // Find most frequent category
    let topCat = 'Other';
    let topCatCount = 0;
    for (const [cat, count] of g.categories) {
      if (count > topCatCount) { topCat = cat; topCatCount = count; }
    }

    // Compute trend: current vs previous month
    const currentSpend = g.monthlyAmounts[currentMonth] || 0;
    const prevSpend = prevMonth ? (g.monthlyAmounts[prevMonth] || 0) : 0;
    const trend = prevSpend > 0 ? ((currentSpend - prevSpend) / prevSpend) * 100 : 0;

    // Round monthly amounts
    const roundedMonthly: Record<string, number> = {};
    for (const [m, v] of Object.entries(g.monthlyAmounts)) {
      roundedMonthly[m] = Math.round(v * 100) / 100;
    }

    merchants.push({
      name: g.name,
      totalSpent: Math.round(g.totalSpent * 100) / 100,
      transactionCount: g.count,
      avgAmount: Math.round((g.totalSpent / g.count) * 100) / 100,
      category: topCat,
      lastTransaction: g.lastDate,
      trend: Math.round(trend * 10) / 10,
      monthlyAmounts: roundedMonthly,
    });
  }

  merchants.sort((a, b) => b.totalSpent - a.totalSpent);
  const top50 = merchants.slice(0, 50);

  await redisSet(cacheKey, JSON.stringify(top50), ANALYTICS_TTL_S);
  return top50;
}
