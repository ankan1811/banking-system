import { prisma } from '../lib/db.js';
import { geminiModel } from '../lib/gemini.js';
import { getAllUserTransactions } from './bank.service.js';
import { getBudgetStatus } from './budget.service.js';
import { redisGet, redisSet, redisDel } from '../lib/redis.js';
import type { HealthScore } from '@shared/types';

const SCORE_TTL_S = 100 * 60 * 60; // 100 hours in seconds

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export async function getHealthScore(
  userId: string,
  month: string,
  useAi: boolean = false
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
        source: (dbScore.source === 'ai' ? 'ai' : 'formula') as 'ai' | 'formula',
      };
      const remainingTtlS = Math.floor((SCORE_TTL_S * 1000 - ageMs) / 1000);
      await redisSet(cacheKey, JSON.stringify(result), remainingTtlS);
      return result;
    }
  }

  // Layer 3: Compute score (AI or formula)
  const metrics = await computeMetrics(userId, month);

  let result: HealthScore;
  if (useAi) {
    // Clear caches before AI generation
    await redisDel(cacheKey);
    await prisma.financialHealthScore.deleteMany({
      where: { userId, month },
    });

    try {
      result = { ...await callGeminiForScore(metrics), source: 'ai' };
    } catch (err) {
      console.error('Gemini health score error, using local fallback:', err);
      result = { ...computeLocalFallback(metrics), source: 'formula' };
    }
  } else {
    result = { ...computeLocalFallback(metrics), source: 'formula' };
  }

  // Persist to DB
  await prisma.financialHealthScore.upsert({
    where: { userId_month: { userId, month } },
    update: {
      score: result.score,
      breakdown: result.breakdown as any,
      tips: result.tips,
      source: result.source || 'formula',
    },
    create: {
      userId,
      month,
      score: result.score,
      breakdown: result.breakdown as any,
      tips: result.tips,
      source: result.source || 'formula',
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

async function computeMetrics(userId: string, month: string): Promise<Metrics> {
  const [transactions, budgetStatuses, goals] = await Promise.all([
    getAllUserTransactions(userId),
    getBudgetStatus(userId, month).catch(() => []),
    prisma.savingsGoal.findMany({ where: { userId, status: 'active' } }),
  ]);
  const monthTxns = transactions.filter((t: any) => (t.date || '').startsWith(month));

  let totalIncome = 0;
  let totalExpenses = 0;
  const categories = new Set<string>();
  for (const t of monthTxns) {
    const cat = (t as any).aiCategory || t.category || 'Other';
    categories.add(cat);
    const isDebit = t.type === 'debit' || (t.type !== 'credit' && t.amount < 0);
    if (!isDebit || cat === 'Income') {
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

// ─── Single Gemini call with pre-aggregated data (~200 bytes) ─

async function callGeminiForScore(metrics: Metrics): Promise<HealthScore> {
  const prompt = `You are a financial health scoring engine. Given these pre-computed metrics for a user's finances this month, generate:
1. An overall financial health score (0-100, integer)
2. A breakdown with sub-scores (0-100 each): budgetAdherence, savingsRate, spendingTrend, goalProgress
3. 3-5 personalized, actionable tips based on the data

Respond ONLY with valid JSON:
{"score":number,"breakdown":{"budgetAdherence":number,"savingsRate":number,"spendingTrend":number,"goalProgress":number},"tips":["string"]}

User metrics:
- Budget adherence: ${metrics.budgetAdherence}% (${metrics.budgetCount} budgets set)
- Savings rate: ${metrics.savingsRate}% (income $${metrics.totalIncome}, expenses $${metrics.totalExpenses})
- Spending diversity: ${metrics.categoryCount} categories
- Goal progress: ${metrics.goalProgress}% across ${metrics.goalCount} active goals`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(extractJSON(text));

  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score || 50))),
    breakdown: {
      budgetAdherence: Math.round(parsed.breakdown?.budgetAdherence || metrics.budgetAdherence),
      savingsRate: Math.round(Math.max(0, Math.min(100, parsed.breakdown?.savingsRate || metrics.savingsRate))),
      spendingTrend: Math.round(parsed.breakdown?.spendingTrend || 50),
      goalProgress: Math.round(parsed.breakdown?.goalProgress || metrics.goalProgress),
    },
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
    generatedAt: new Date().toISOString(),
  };
}

// ─── Local fallback (no Gemini needed) ───────────────────────

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
