import { prisma } from '../lib/db.js';
import { geminiModel } from '../lib/gemini.js';
import { getAccounts } from './bank.service.js';
import { redisGet, redisSet, redisDel } from '../lib/redis.js';

const INSIGHT_TTL_S = 100 * 60 * 60; // 100 hours in seconds

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

// ─── Manual Assets CRUD ─────────────────────────────────────

export async function getManualAssets(userId: string) {
  return prisma.manualAsset.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createManualAsset(
  userId: string,
  data: { name: string; category: string; value: number; notes?: string }
) {
  return prisma.manualAsset.create({
    data: { userId, name: data.name, category: data.category, value: data.value, notes: data.notes || null },
  });
}

export async function updateManualAsset(
  userId: string,
  assetId: string,
  data: { name?: string; category?: string; value?: number; notes?: string | null }
) {
  const updated = await prisma.manualAsset.updateMany({
    where: { id: assetId, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  if (updated.count === 0) throw new Error('Asset not found');
  return prisma.manualAsset.findUnique({ where: { id: assetId } });
}

export async function deleteManualAsset(userId: string, assetId: string) {
  const deleted = await prisma.manualAsset.deleteMany({ where: { id: assetId, userId } });
  if (deleted.count === 0) throw new Error('Asset not found');
  return deleted;
}

// ─── Manual Liabilities CRUD ────────────────────────────────

export async function getManualLiabilities(userId: string) {
  return prisma.manualLiability.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createManualLiability(
  userId: string,
  data: { name: string; category: string; value: number; notes?: string }
) {
  return prisma.manualLiability.create({
    data: { userId, name: data.name, category: data.category, value: data.value, notes: data.notes || null },
  });
}

export async function updateManualLiability(
  userId: string,
  liabilityId: string,
  data: { name?: string; category?: string; value?: number; notes?: string | null }
) {
  const updated = await prisma.manualLiability.updateMany({
    where: { id: liabilityId, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  if (updated.count === 0) throw new Error('Liability not found');
  return prisma.manualLiability.findUnique({ where: { id: liabilityId } });
}

export async function deleteManualLiability(userId: string, liabilityId: string) {
  const deleted = await prisma.manualLiability.deleteMany({ where: { id: liabilityId, userId } });
  if (deleted.count === 0) throw new Error('Liability not found');
  return deleted;
}

// ─── Net Worth Calculation ──────────────────────────────────

export async function getNetWorth(userId: string, months: number = 12, useAi: boolean = false) {
  // Step 1: Get linked account balances
  let linkedAssets = 0;
  const linkedBreakdown: { name: string; balance: number }[] = [];
  try {
    const accountsData = await getAccounts(userId);
    for (const account of accountsData.data) {
      linkedAssets += account.currentBalance;
      linkedBreakdown.push({ name: account.name, balance: account.currentBalance });
    }
  } catch {
    // If Plaid fails, continue with 0 linked assets
  }

  // Step 2: Get manual assets & liabilities
  const [assets, liabilities] = await Promise.all([
    prisma.manualAsset.findMany({ where: { userId } }),
    prisma.manualLiability.findMany({ where: { userId } }),
  ]);

  const manualAssetsTotal = assets.reduce((sum, a) => sum + parseFloat(a.value.toString()), 0);
  const liabilitiesTotal = liabilities.reduce((sum, l) => sum + parseFloat(l.value.toString()), 0);

  // Step 3: Compute totals
  const totalAssets = linkedAssets + manualAssetsTotal;
  const netWorth = totalAssets - liabilitiesTotal;

  const breakdown = {
    linkedAccounts: linkedBreakdown,
    manualAssets: assets.map((a) => ({ name: a.name, category: a.category, value: parseFloat(a.value.toString()) })),
    liabilities: liabilities.map((l) => ({ name: l.name, category: l.category, value: parseFloat(l.value.toString()) })),
  };

  // Step 4: Upsert current month snapshot
  const currentMonth = new Date().toISOString().slice(0, 7);
  await prisma.netWorthSnapshot.upsert({
    where: { userId_month: { userId, month: currentMonth } },
    create: {
      userId,
      month: currentMonth,
      linkedAssets: Math.round(linkedAssets * 100) / 100,
      manualAssets: Math.round(manualAssetsTotal * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(liabilitiesTotal * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
      breakdown: breakdown as any,
    },
    update: {
      linkedAssets: Math.round(linkedAssets * 100) / 100,
      manualAssets: Math.round(manualAssetsTotal * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(liabilitiesTotal * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
      breakdown: breakdown as any,
    },
  });

  // Step 5: Get historical snapshots
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    .toISOString().slice(0, 7);
  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { userId, month: { gte: startMonth } },
    orderBy: { month: 'asc' },
  });

  const history = snapshots.map((s) => ({
    month: s.month,
    linkedAssets: parseFloat(s.linkedAssets.toString()),
    manualAssets: parseFloat(s.manualAssets.toString()),
    totalAssets: parseFloat(s.totalAssets.toString()),
    totalLiabilities: parseFloat(s.totalLiabilities.toString()),
    netWorth: parseFloat(s.netWorth.toString()),
  }));

  // Step 6: Monthly change
  let monthlyChange = 0;
  let monthlyChangePercent = 0;
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    monthlyChange = netWorth - prev.netWorth;
    monthlyChangePercent = prev.netWorth !== 0 ? (monthlyChange / Math.abs(prev.netWorth)) * 100 : 0;
  }

  // Step 7: Optional AI insight
  let aiInsight: string | null = null;
  let aiInsightSource: 'ai' | 'formula' | null = null;
  if (history.length >= 3) {
    try {
      const result = await getNetWorthInsight(userId, history, useAi);
      aiInsight = result.text;
      aiInsightSource = result.source;
    } catch {
      // Silently skip AI insight
    }
  }

  return {
    current: {
      linkedAssets: Math.round(linkedAssets * 100) / 100,
      manualAssets: Math.round(manualAssetsTotal * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(liabilitiesTotal * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
      monthlyChange: Math.round(monthlyChange * 100) / 100,
      monthlyChangePercent: Math.round(monthlyChangePercent * 10) / 10,
    },
    breakdown,
    history,
    aiInsight,
    aiInsightSource,
  };
}

async function getNetWorthInsight(
  userId: string,
  history: any[],
  useAi: boolean = false
): Promise<{ text: string; source: 'ai' | 'formula' }> {
  const cacheKey = `net-worth-insight:${userId}`;

  if (useAi) await redisDel(cacheKey);

  const raw = await redisGet(cacheKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === 'string') return parsed as { text: string; source: 'ai' | 'formula' };
    } catch { /* old format: plain text string */ }
    return { text: raw, source: 'formula' };
  }

  const last6 = history.slice(-6);

  // useAi=false: skip Gemini, use formula fallback
  if (!useAi) {
    const fallback = computeNetWorthFallback(last6);
    const cached = { text: fallback, source: 'formula' as const };
    await redisSet(cacheKey, JSON.stringify(cached), 5 * 60);
    return cached;
  }

  // useAi=true: call Gemini
  const prompt = `Given these monthly net worth snapshots for a user, provide a 2-sentence insight about the trend and one actionable tip. Return plain text only, no JSON.

Snapshots: ${JSON.stringify(last6.map((s: any) => ({ month: s.month, netWorth: s.netWorth, assets: s.totalAssets, liabilities: s.totalLiabilities })))}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();

    const cached = { text, source: 'ai' as const };
    await redisSet(cacheKey, JSON.stringify(cached), INSIGHT_TTL_S);
    return cached;
  } catch (err) {
    console.error('Gemini net worth insight error:', err);
    const fallback = computeNetWorthFallback(last6);
    const cached = { text: fallback, source: 'formula' as const };
    await redisSet(cacheKey, JSON.stringify(cached), 5 * 60);
    return cached;
  }
}

function computeNetWorthFallback(last6: any[]): string {
  const newest = last6[last6.length - 1];
  const oldest = last6[0];
  const totalChange = newest.netWorth - oldest.netWorth;
  const monthsSpan = last6.length - 1;
  const avgMonthlyChange = monthsSpan > 0 ? totalChange / monthsSpan : 0;
  const pctChange = oldest.netWorth !== 0 ? (totalChange / Math.abs(oldest.netWorth)) * 100 : 0;

  const trend = totalChange > 0 ? 'growing' : totalChange < 0 ? 'declining' : 'stable';

  let insight: string;
  if (trend === 'stable') {
    insight = `Your net worth has remained stable at $${newest.netWorth.toLocaleString()} over the past ${last6.length} months.`;
  } else {
    insight = `Your net worth has been ${trend} over the past ${last6.length} months, moving from $${oldest.netWorth.toLocaleString()} to $${newest.netWorth.toLocaleString()} (${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%).`;
  }

  let tip: string;
  if (newest.totalLiabilities > newest.totalAssets * 0.5) {
    tip = 'Your liabilities are more than half your assets — focus on paying down high-interest debt to accelerate net worth growth.';
  } else if (trend === 'declining') {
    tip = `You're averaging -$${Math.abs(avgMonthlyChange).toFixed(0)}/month in net worth change. Review recent expenses and look for areas to cut back.`;
  } else if (trend === 'growing') {
    tip = `At your current pace of +$${avgMonthlyChange.toFixed(0)}/month, keep it up and consider increasing contributions to savings or investments.`;
  } else {
    tip = 'Consider setting a savings goal to start growing your net worth consistently.';
  }

  return `${insight} ${tip}`;
}
