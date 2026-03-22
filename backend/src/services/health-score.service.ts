import { prisma } from '../lib/db.js';
import { getAccount } from './bank.service.js';
import { getBudgetStatus } from './budget.service.js';
import { redisGet, redisSet } from '../lib/redis.js';
import type { HealthScore } from '@shared/types';

const SCORE_TTL_S = 100 * 60 * 60; // 100 hours in seconds

export async function getHealthScore(
  userId: string,
  bankRecordId: string,
  month: string
): Promise<HealthScore> {
  const cacheKey = `health:${userId}:${month}`;

  // Layer 1: Redis cache
  const redisCached = await redisGet(cacheKey);
  if (redisCached) {
    console.log(`[CACHE HIT] health score Redis ${cacheKey}`);
    return JSON.parse(redisCached) as HealthScore;
  }

  // Layer 2: DB cache (survives restarts)
  const dbScore = await prisma.financialHealthScore.findUnique({
    where: { userId_month: { userId, month } },
  });
  if (dbScore) {
    const ageMs = Date.now() - dbScore.updatedAt.getTime();
    if (ageMs < SCORE_TTL_S * 1000) {
      console.log(`[CACHE HIT] health score DB ${cacheKey}`);
      const result: HealthScore = {
        score: dbScore.score,
        breakdown: dbScore.breakdown as HealthScore['breakdown'],
        tips: dbScore.tips as string[],
        generatedAt: dbScore.generatedAt.toISOString(),
      };
      const remainingTtlS = Math.floor((SCORE_TTL_S * 1000 - ageMs) / 1000);
      await redisSet(cacheKey, JSON.stringify(result), remainingTtlS);
      return result;
    }
  }

  // Layer 3: Compute metrics locally, then use formula-based scoring
  const metrics = await computeMetrics(userId, bankRecordId, month);
  const result = computeLocalFallback(metrics);

  // Persist to DB
  await prisma.financialHealthScore.upsert({
    where: { userId_month: { userId, month } },
    update: {
      score: result.score,
      breakdown: result.breakdown as any,
      tips: result.tips,
    },
    create: {
      userId,
      month,
      score: result.score,
      breakdown: result.breakdown as any,
      tips: result.tips,
    },
  });

  await redisSet(cacheKey, JSON.stringify(result), SCORE_TTL_S);
  return result;
}

// ─── Pre-compute metrics locally (no Gemini call) ────────────

interface Metrics {
  budgetAdherence: number; // 0-100 (100 = all budgets on track)
  savingsRate: number;     // 0-100 (% of income saved)
  totalIncome: number;
  totalExpenses: number;
  categoryCount: number;   // spending diversity
  goalProgress: number;    // 0-100 avg across goals
  budgetCount: number;
  goalCount: number;
}

async function computeMetrics(userId: string, bankRecordId: string, month: string): Promise<Metrics> {
  const [accountData, budgetStatuses, goals] = await Promise.all([
    getAccount(bankRecordId),
    getBudgetStatus(userId, bankRecordId, month).catch(() => []),
    prisma.savingsGoal.findMany({ where: { userId, status: 'active' } }),
  ]);

  const { transactions } = accountData;
  const monthTxns = transactions.filter((t: any) => (t.date || '').startsWith(month));

  let totalIncome = 0;
  let totalExpenses = 0;
  const categories = new Set<string>();
  for (const t of monthTxns) {
    const cat = (t as any).aiCategory || t.category || 'Other';
    categories.add(cat);
    if (t.amount < 0 || cat === 'Income') {
      totalIncome += Math.abs(t.amount);
    } else {
      totalExpenses += Math.abs(t.amount);
    }
  }

  // Budget adherence: avg of (100 - percentUsed) clamped to 0
  const budgetsWithLimits = budgetStatuses.filter((b: any) => b.monthlyLimit !== null);
  const budgetAdherence = budgetsWithLimits.length > 0
    ? budgetsWithLimits.reduce((sum: number, b: any) => sum + Math.max(0, 100 - (b.percentUsed || 0)), 0) / budgetsWithLimits.length
    : 50; // neutral if no budgets

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Goal progress: avg savedAmount/targetAmount across active goals
  let goalProgress = 50; // neutral if no goals
  if (goals.length > 0) {
    const avgPct = goals.reduce((sum, g) => {
      const saved = parseFloat(g.savedAmount.toString());
      const target = parseFloat(g.targetAmount.toString());
      return sum + (target > 0 ? (saved / target) * 100 : 0);
    }, 0) / goals.length;
    goalProgress = Math.min(avgPct, 100);
  }

  return {
    budgetAdherence: Math.round(budgetAdherence * 10) / 10,
    savingsRate: Math.round(savingsRate * 10) / 10,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    categoryCount: categories.size,
    goalProgress: Math.round(goalProgress * 10) / 10,
    budgetCount: budgetsWithLimits.length,
    goalCount: goals.length,
  };
}

// ─── Formula-based scoring (no AI needed) ───────────────────

function computeLocalFallback(metrics: Metrics): HealthScore {
  const savingsScore = Math.max(0, Math.min(100, metrics.savingsRate * 2));
  const score = Math.round(
    metrics.budgetAdherence * 0.3 +
    savingsScore * 0.3 +
    50 * 0.2 + // neutral spending trend
    metrics.goalProgress * 0.2
  );

  const tips: string[] = [];
  if (metrics.savingsRate < 10) tips.push('Try to save at least 10-20% of your income each month.');
  if (metrics.budgetAdherence < 50) tips.push('Several budgets are over the limit — review your top spending categories.');
  if (metrics.budgetCount === 0) tips.push('Set monthly budgets to track spending against your targets.');
  if (metrics.goalCount === 0) tips.push('Create a savings goal to stay motivated toward financial milestones.');
  if (tips.length === 0) tips.push('Great job! Keep maintaining your current spending habits.');

  return {
    score,
    breakdown: {
      budgetAdherence: Math.round(metrics.budgetAdherence),
      savingsRate: Math.round(savingsScore),
      spendingTrend: 50,
      goalProgress: Math.round(metrics.goalProgress),
    },
    tips,
    generatedAt: new Date().toISOString(),
  };
}
