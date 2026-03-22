import { prisma } from '../lib/db.js';
import { getAccount } from './bank.service.js';
import { redisGet, redisSet } from '../lib/redis.js';
import type { AICategory } from '@shared/types';
import { AI_CATEGORIES } from '@shared/types';

const BUDGET_STATUS_TTL_S = 60 * 60; // 1 hour in seconds

export async function getBudgets(userId: string, month: string) {
  return prisma.budget.findMany({
    where: { userId, month },
    orderBy: { category: 'asc' },
  });
}

export async function upsertBudget(
  userId: string,
  category: AICategory,
  monthlyLimit: number,
  month: string
) {
  return prisma.budget.upsert({
    where: { userId_category_month: { userId, category, month } },
    update: { monthlyLimit },
    create: { userId, category, monthlyLimit, month },
  });
}

export async function deleteBudget(userId: string, budgetId: string) {
  const budget = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!budget) throw new Error('Budget not found');
  return prisma.budget.delete({ where: { id: budgetId } });
}

export async function getBudgetStatus(userId: string, bankRecordId: string, month: string) {
  const cacheKey = `budget-status:${userId}:${bankRecordId}:${month}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw);

  const [budgets, accountData] = await Promise.all([
    prisma.budget.findMany({ where: { userId, month } }),
    getAccount(bankRecordId),
  ]);

  const { transactions } = accountData;

  // Aggregate spending per AI category for this month
  const spendingMap: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.date?.startsWith(month)) continue;
    if (t.amount <= 0) continue; // skip credits
    const cat = (t as any).aiCategory || t.category || 'Other';
    spendingMap[cat] = (spendingMap[cat] || 0) + Math.abs(t.amount);
  }

  // Build status for all AI categories that have either a budget or spending
  const budgetMap = new Map(budgets.map((b) => [b.category, b]));
  const relevantCategories = new Set([
    ...AI_CATEGORIES,
    ...Object.keys(spendingMap),
  ]);

  const statuses = [];
  for (const category of relevantCategories) {
    const budget = budgetMap.get(category);
    const spent = spendingMap[category] || 0;
    const monthlyLimit = budget ? parseFloat(budget.monthlyLimit.toString()) : null;
    const remaining = monthlyLimit !== null ? monthlyLimit - spent : null;
    const percentUsed = monthlyLimit !== null && monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : null;

    // Only include categories with a budget OR with actual spending
    if (budget || spent > 0) {
      statuses.push({
        category,
        budgetId: budget?.id || null,
        monthlyLimit,
        spent: Math.round(spent * 100) / 100,
        remaining: remaining !== null ? Math.round(remaining * 100) / 100 : null,
        percentUsed: percentUsed !== null ? Math.round(percentUsed * 10) / 10 : null,
      });
    }
  }

  const sorted = statuses.sort((a, b) => {
    // Sort: over-budget first, then by percent used desc, then by spent desc
    const aOver = a.percentUsed !== null && a.percentUsed >= 100;
    const bOver = b.percentUsed !== null && b.percentUsed >= 100;
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    if (a.percentUsed !== null && b.percentUsed !== null) return b.percentUsed - a.percentUsed;
    return b.spent - a.spent;
  });

  await redisSet(cacheKey, JSON.stringify(sorted), BUDGET_STATUS_TTL_S);
  return sorted;
}
