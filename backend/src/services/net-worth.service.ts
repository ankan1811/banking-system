import { prisma } from '../lib/db.js';
import { geminiModel } from '../lib/gemini.js';
import { getAccounts } from './bank.service.js';
import { redisGet, redisSet } from '../lib/redis.js';

const INSIGHT_TTL_S = 24 * 60 * 60; // 24 hours in seconds

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
  const asset = await prisma.manualAsset.findFirst({ where: { id: assetId, userId } });
  if (!asset) throw new Error('Asset not found');
  return prisma.manualAsset.update({
    where: { id: assetId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteManualAsset(userId: string, assetId: string) {
  const asset = await prisma.manualAsset.findFirst({ where: { id: assetId, userId } });
  if (!asset) throw new Error('Asset not found');
  return prisma.manualAsset.delete({ where: { id: assetId } });
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
  const liability = await prisma.manualLiability.findFirst({ where: { id: liabilityId, userId } });
  if (!liability) throw new Error('Liability not found');
  return prisma.manualLiability.update({
    where: { id: liabilityId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteManualLiability(userId: string, liabilityId: string) {
  const liability = await prisma.manualLiability.findFirst({ where: { id: liabilityId, userId } });
  if (!liability) throw new Error('Liability not found');
  return prisma.manualLiability.delete({ where: { id: liabilityId } });
}

// ─── Net Worth Calculation ──────────────────────────────────

export async function getNetWorth(userId: string, months: number = 12) {
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
  if (history.length >= 3) {
    try {
      aiInsight = await getNetWorthInsight(userId, history);
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
  };
}

async function getNetWorthInsight(userId: string, history: any[]): Promise<string> {
  const cacheKey = `net-worth-insight:${userId}`;
  const raw = await redisGet(cacheKey);
  if (raw) return raw;

  const last6 = history.slice(-6);
  const prompt = `Given these monthly net worth snapshots for a user, provide a 2-sentence insight about the trend and one actionable tip. Return plain text only, no JSON.

Snapshots: ${JSON.stringify(last6.map((s: any) => ({ month: s.month, netWorth: s.netWorth, assets: s.totalAssets, liabilities: s.totalLiabilities })))}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();

    await redisSet(cacheKey, text, INSIGHT_TTL_S);
    return text;
  } catch (err) {
    console.error('Gemini net worth insight error:', err);
    // Cache a fallback so we stop retrying while rate-limited (5 min cooldown)
    const fallback = 'Net worth insight is temporarily unavailable. Please check back later.';
    await redisSet(cacheKey, fallback, 5 * 60);
    return fallback;
  }
}
