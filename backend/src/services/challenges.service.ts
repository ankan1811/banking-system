import { prisma } from '../lib/db.js';
import { geminiModel } from '../lib/gemini.js';
import { getAccount } from './bank.service.js';
import { AI_CATEGORIES } from '@shared/types';
import type { AiChallengeSuggestion, ChallengeProgress, ChallengeStreak, Badge } from '@shared/types';

// ─── Cache for AI suggestions (30-day TTL, DB-backed + in-memory) ──
const suggestionsCache = new Map<string, { data: AiChallengeSuggestion[]; expiresAt: number }>();
const SUGGESTIONS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export function clearSuggestionsCache(bankRecordId: string) {
  for (const key of suggestionsCache.keys()) {
    if (key.includes(`:${bankRecordId}:`)) suggestionsCache.delete(key);
  }
  // Also clear from DB
  prisma.challengeSuggestionCache.deleteMany({ where: { bankRecordId } }).catch(() => {});
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

// ─── CRUD ───────────────────────────────────────────────────

export async function getChallenges(userId: string, status?: string) {
  return prisma.spendingChallenge.findMany({
    where: { userId, ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createChallenge(
  userId: string,
  data: {
    title: string;
    description: string;
    type: string;
    category?: string;
    targetAmount?: number;
    duration: string;
    isAiGenerated?: boolean;
  }
) {
  const startDate = new Date();
  const endDate = new Date();
  if (data.duration === 'weekly') {
    endDate.setDate(endDate.getDate() + 7);
  } else {
    endDate.setDate(endDate.getDate() + 30);
  }

  return prisma.spendingChallenge.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      type: data.type,
      category: data.category || null,
      targetAmount: data.targetAmount || null,
      duration: data.duration,
      startDate,
      endDate,
      isAiGenerated: data.isAiGenerated || false,
    },
  });
}

export async function abandonChallenge(userId: string, challengeId: string) {
  const challenge = await prisma.spendingChallenge.findFirst({ where: { id: challengeId, userId } });
  if (!challenge) throw new Error('Challenge not found');
  return prisma.spendingChallenge.update({
    where: { id: challengeId },
    data: { status: 'abandoned' },
  });
}

// ─── Progress Calculation ───────────────────────────────────

export async function getChallengeProgress(
  userId: string,
  bankRecordId: string
): Promise<ChallengeProgress[]> {
  const activeChallenges = await prisma.spendingChallenge.findMany({
    where: { userId, status: 'active' },
  });

  if (activeChallenges.length === 0) return [];

  const { transactions } = await getAccount(bankRecordId);
  const now = new Date();

  const results: ChallengeProgress[] = [];

  for (const challenge of activeChallenges) {
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const targetAmount = challenge.targetAmount ? parseFloat(challenge.targetAmount.toString()) : 0;
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Filter transactions within challenge period
    const periodTxns = transactions.filter((t: any) => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= (now < end ? now : end);
    });

    let progress: ChallengeProgress;

    if (challenge.type === 'category_limit') {
      const catTxns = periodTxns.filter(
        (t: any) => (t.aiCategory || t.category || 'Other') === challenge.category && t.amount > 0
      );
      const currentSpent = catTxns.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      const percentUsed = targetAmount > 0 ? (currentSpent / targetAmount) * 100 : 0;
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const proratedTarget = totalDays > 0 ? (targetAmount * elapsedDays) / totalDays : targetAmount;

      progress = {
        challenge: serializeChallenge(challenge),
        currentSpent: Math.round(currentSpent * 100) / 100,
        targetAmount,
        percentUsed: Math.round(percentUsed * 10) / 10,
        daysRemaining,
        isOnTrack: currentSpent <= proratedTarget,
        noSpendDaysHit: 0,
        noSpendDaysTarget: 0,
      };
    } else if (challenge.type === 'no_spend') {
      // Count days with zero spending
      const spendingByDay = new Map<string, number>();
      for (const t of periodTxns) {
        if ((t as any).amount > 0) {
          const day = new Date((t as any).date).toISOString().slice(0, 10);
          spendingByDay.set(day, (spendingByDay.get(day) || 0) + Math.abs((t as any).amount));
        }
      }
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.max(1, Math.ceil(((now < end ? now : end).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const noSpendDaysHit = elapsedDays - spendingByDay.size;
      const noSpendTarget = targetAmount > 0 ? targetAmount : Math.ceil(totalDays * 0.3); // default 30% of days

      progress = {
        challenge: serializeChallenge(challenge),
        currentSpent: 0,
        targetAmount: noSpendTarget,
        percentUsed: noSpendTarget > 0 ? Math.round((noSpendDaysHit / noSpendTarget) * 1000) / 10 : 0,
        daysRemaining,
        isOnTrack: noSpendDaysHit >= Math.floor(noSpendTarget * (elapsedDays / totalDays)),
        noSpendDaysHit,
        noSpendDaysTarget: noSpendTarget,
      };
    } else {
      // savings_target: income - expenses
      let income = 0;
      let expenses = 0;
      for (const t of periodTxns) {
        const cat = (t as any).aiCategory || (t as any).category || 'Other';
        if ((t as any).amount < 0 || cat === 'Income') {
          income += Math.abs((t as any).amount);
        } else {
          expenses += Math.abs((t as any).amount);
        }
      }
      const saved = Math.max(0, income - expenses);
      const percentUsed = targetAmount > 0 ? (saved / targetAmount) * 100 : 0;

      progress = {
        challenge: serializeChallenge(challenge),
        currentSpent: Math.round(saved * 100) / 100,
        targetAmount,
        percentUsed: Math.round(percentUsed * 10) / 10,
        daysRemaining,
        isOnTrack: percentUsed >= 50, // on track if saved at least 50% by now
        noSpendDaysHit: 0,
        noSpendDaysTarget: 0,
      };
    }

    // Auto-complete/fail expired challenges
    if (now > end && challenge.status === 'active') {
      const succeeded =
        challenge.type === 'category_limit' ? progress.percentUsed <= 100 :
        challenge.type === 'no_spend' ? progress.noSpendDaysHit >= progress.noSpendDaysTarget :
        progress.percentUsed >= 100;

      const newStatus = succeeded ? 'completed' : 'failed';
      await prisma.spendingChallenge.update({
        where: { id: challenge.id },
        data: { status: newStatus },
      });
      progress.challenge.status = newStatus;

      if (succeeded) {
        await updateStreak(userId);
        await checkBadges(userId, challenge.type === 'savings_target' ? progress.percentUsed : undefined);
      } else {
        // Reset current streak on failure
        await prisma.challengeStreak.upsert({
          where: { userId },
          create: { userId, currentStreak: 0, longestStreak: 0, totalCompleted: 0 },
          update: { currentStreak: 0 },
        });
      }
    }

    results.push(progress);
  }

  return results;
}

function serializeChallenge(c: any) {
  return {
    id: c.id,
    userId: c.userId,
    title: c.title,
    description: c.description,
    type: c.type,
    category: c.category,
    targetAmount: c.targetAmount ? parseFloat(c.targetAmount.toString()) : null,
    duration: c.duration,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate.toISOString(),
    status: c.status,
    isAiGenerated: c.isAiGenerated,
    createdAt: c.createdAt.toISOString(),
  };
}

// ─── AI Suggestions ─────────────────────────────────────────

export async function getAiSuggestions(
  userId: string,
  bankRecordId: string
): Promise<AiChallengeSuggestion[]> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const cacheKey = `${userId}:${bankRecordId}:${currentMonth}`;

  // Layer 1: In-memory cache
  const memCached = suggestionsCache.get(cacheKey);
  if (memCached && memCached.expiresAt > Date.now()) return memCached.data;

  // Layer 2: DB cache (survives server restarts)
  const dbCached = await prisma.challengeSuggestionCache.findUnique({
    where: { userId_bankRecordId_month: { userId, bankRecordId, month: currentMonth } },
  });
  if (dbCached) {
    const ageMs = Date.now() - dbCached.generatedAt.getTime();
    if (ageMs < SUGGESTIONS_TTL) {
      console.log(`[CACHE HIT] challenge suggestions DB ${cacheKey}`);
      const suggestions = dbCached.suggestions as AiChallengeSuggestion[];
      suggestionsCache.set(cacheKey, { data: suggestions, expiresAt: dbCached.generatedAt.getTime() + SUGGESTIONS_TTL });
      return suggestions;
    }
  }

  // Layer 3: Gemini call
  try {
    const { transactions } = await getAccount(bankRecordId);
    const monthTxns = transactions.filter((t: any) => (t.date || '').startsWith(currentMonth) && t.amount > 0);

    const byCategory: Record<string, number> = {};
    for (const t of monthTxns) {
      const cat = (t as any).aiCategory || (t as any).category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs((t as any).amount);
    }

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const prompt = `You are a financial wellness coach. Based on this user's top spending categories this month, suggest 3 personalized spending challenges to help them save money. Each challenge should be achievable and motivating.

Top spending categories: ${JSON.stringify(topCategories.map(([cat, amount]) => ({ category: cat, spent: Math.round(amount) })))}

Respond ONLY with a valid JSON array:
[{ "title": "string", "description": "string", "type": "category_limit" | "no_spend" | "savings_target", "category": "string or null", "targetAmount": number or null, "duration": "weekly" | "monthly" }]`;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(extractJSON(text));

    const suggestions: AiChallengeSuggestion[] = Array.isArray(parsed) ? parsed.slice(0, 3).map((s: any) => ({
      title: String(s.title || ''),
      description: String(s.description || ''),
      type: ['category_limit', 'no_spend', 'savings_target'].includes(s.type) ? s.type : 'category_limit',
      category: s.category && AI_CATEGORIES.includes(s.category) ? s.category : null,
      targetAmount: typeof s.targetAmount === 'number' ? s.targetAmount : null,
      duration: s.duration === 'weekly' ? 'weekly' : 'monthly',
    })) : getDefaultSuggestions();

    // Persist to DB + in-memory
    await prisma.challengeSuggestionCache.upsert({
      where: { userId_bankRecordId_month: { userId, bankRecordId, month: currentMonth } },
      update: { suggestions: suggestions as any, generatedAt: new Date() },
      create: { userId, bankRecordId, month: currentMonth, suggestions: suggestions as any },
    });
    suggestionsCache.set(cacheKey, { data: suggestions, expiresAt: Date.now() + SUGGESTIONS_TTL });
    return suggestions;
  } catch (err) {
    console.error('AI suggestions error:', err);
    // Cache defaults in memory (5 min cooldown) so we don't hammer Gemini
    const defaults = getDefaultSuggestions();
    suggestionsCache.set(cacheKey, { data: defaults, expiresAt: Date.now() + 5 * 60 * 1000 });
    return defaults;
  }
}

function getDefaultSuggestions(): AiChallengeSuggestion[] {
  return [
    {
      title: 'Dining Budget Challenge',
      description: 'Limit eating out to save more this month.',
      type: 'category_limit',
      category: 'Food & Dining',
      targetAmount: 200,
      duration: 'monthly',
    },
    {
      title: 'No-Spend Weekend',
      description: 'Go a full weekend without spending anything.',
      type: 'no_spend',
      category: null,
      targetAmount: 2,
      duration: 'weekly',
    },
    {
      title: 'Save $500 This Month',
      description: 'Put away $500 in savings by month end.',
      type: 'savings_target',
      category: null,
      targetAmount: 500,
      duration: 'monthly',
    },
  ];
}

// ─── Streak & Badges ────────────────────────────────────────

export async function getStreakAndBadges(userId: string): Promise<{ streak: ChallengeStreak; badges: Badge[] }> {
  const streakRecord = await prisma.challengeStreak.findUnique({ where: { userId } });
  const badges = await prisma.badge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });

  const streak: ChallengeStreak = streakRecord
    ? { currentStreak: streakRecord.currentStreak, longestStreak: streakRecord.longestStreak, totalCompleted: streakRecord.totalCompleted }
    : { currentStreak: 0, longestStreak: 0, totalCompleted: 0 };

  return {
    streak,
    badges: badges.map((b) => ({
      id: b.id,
      badgeType: b.badgeType as Badge['badgeType'],
      earnedAt: b.earnedAt.toISOString(),
    })),
  };
}

async function updateStreak(userId: string) {
  // Count consecutive completed challenges (most recent first, no failed/abandoned in between)
  const challenges = await prisma.spendingChallenge.findMany({
    where: { userId, status: { in: ['completed', 'failed'] } },
    orderBy: { endDate: 'desc' },
  });

  let currentStreak = 0;
  for (const c of challenges) {
    if (c.status === 'completed') {
      currentStreak++;
    } else {
      break;
    }
  }

  const totalCompleted = challenges.filter((c) => c.status === 'completed').length;

  const existing = await prisma.challengeStreak.findUnique({ where: { userId } });
  const longestStreak = existing ? Math.max(existing.longestStreak, currentStreak) : currentStreak;

  await prisma.challengeStreak.upsert({
    where: { userId },
    create: { userId, currentStreak, longestStreak, totalCompleted },
    update: { currentStreak, longestStreak, totalCompleted },
  });
}

async function checkBadges(userId: string, savingsPercent?: number) {
  const streakRecord = await prisma.challengeStreak.findUnique({ where: { userId } });
  if (!streakRecord) return;

  const { currentStreak, totalCompleted } = streakRecord;
  const badgesToAward: string[] = [];

  if (totalCompleted >= 1) badgesToAward.push('first_challenge');
  if (currentStreak >= 3) badgesToAward.push('streak_3');
  if (currentStreak >= 7) badgesToAward.push('streak_7');
  if (currentStreak >= 30) badgesToAward.push('streak_30');
  if (totalCompleted >= 5) badgesToAward.push('five_completed');
  if (totalCompleted >= 10) badgesToAward.push('ten_completed');
  if (savingsPercent && savingsPercent > 120) badgesToAward.push('savings_hero');

  // Check for perfect month: 4+ weekly challenges completed in the current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyCompleted = await prisma.spendingChallenge.count({
    where: {
      userId,
      status: 'completed',
      duration: 'weekly',
      endDate: { gte: new Date(currentMonth + '-01') },
    },
  });
  if (monthlyCompleted >= 4) badgesToAward.push('perfect_month');

  if (badgesToAward.length > 0) {
    await prisma.badge.createMany({
      data: badgesToAward.map((badgeType) => ({ userId, badgeType })),
      skipDuplicates: true,
    });
  }
}

// ─── Overview (bundled endpoint) ────────────────────────────

export async function getChallengesOverview(userId: string, bankRecordId: string) {
  const [progress, { streak, badges }, history] = await Promise.all([
    getChallengeProgress(userId, bankRecordId),
    getStreakAndBadges(userId),
    prisma.spendingChallenge.findMany({
      where: { userId, status: { in: ['completed', 'failed', 'abandoned'] } },
      orderBy: { endDate: 'desc' },
      take: 20,
    }),
  ]);

  return {
    activeChallenges: progress,
    streak,
    badges,
    history: history.map(serializeChallenge),
  };
}
