import { prisma } from '../lib/db.js';
import { geminiModel } from '../lib/gemini.js';
import { getBudgetStatus } from './budget.service.js';
import { getGoals } from './goals.service.js';
import { getHealthScore } from './health-score.service.js';
import { getMerchantInsights, getIncomeVsExpense } from './analytics.service.js';
import { redisGet, redisSet, redisDel } from '../lib/redis.js';
import type { DigestSection, MonthlyDigest } from '@shared/types';
import PDFDocument from 'pdfkit';

const DIGEST_TTL_S = 100 * 60 * 60; // 100 hours in seconds

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export async function getMonthlyDigest(
  userId: string,
  bankRecordId: string,
  month: string,
  useAi: boolean = false
): Promise<MonthlyDigest> {
  const cacheKey = `digest:${userId}:${month}`;

  // Layer 1: Redis cache
  const redisCached = await redisGet(cacheKey);
  if (redisCached) {
    console.log(`[CACHE HIT] digest Redis ${cacheKey}`);
    return JSON.parse(redisCached) as MonthlyDigest;
  }

  // Layer 2: DB cache
  const dbDigest = await prisma.monthlyDigest.findUnique({
    where: { userId_month: { userId, month } },
  });
  if (dbDigest) {
    const ageMs = Date.now() - dbDigest.updatedAt.getTime();
    if (ageMs < DIGEST_TTL_S * 1000) {
      console.log(`[CACHE HIT] digest DB ${cacheKey}`);
      const result: MonthlyDigest = {
        id: dbDigest.id,
        userId: dbDigest.userId,
        month: dbDigest.month,
        bankRecordId: dbDigest.bankRecordId,
        sections: dbDigest.sections as any,
        narrative: dbDigest.narrative,
        narrativeSource: (dbDigest.narrativeSource === 'ai' ? 'ai' : 'formula') as 'ai' | 'formula',
        generatedAt: dbDigest.generatedAt.toISOString(),
      };
      const remainingTtlS = Math.floor((DIGEST_TTL_S * 1000 - ageMs) / 1000);
      await redisSet(cacheKey, JSON.stringify(result), remainingTtlS);
      return result;
    }
  }

  // Layer 3: Aggregate data + narrative generation
  const sections = await aggregateSections(userId, bankRecordId, month);
  let narrative: string;
  let narrativeSource: 'ai' | 'formula';

  if (useAi) {
    // Clear caches before AI generation
    await redisDel(cacheKey);
    await prisma.monthlyDigest.deleteMany({
      where: { userId, month },
    });

    try {
      narrative = await generateNarrative(sections, month);
      narrativeSource = 'ai';
    } catch (err) {
      console.error('Gemini digest error, using local fallback:', err);
      narrative = generateLocalNarrative(sections, month);
      narrativeSource = 'formula';
    }
  } else {
    narrative = generateLocalNarrative(sections, month);
    narrativeSource = 'formula';
  }

  // Persist to DB
  const dbResult = await prisma.monthlyDigest.upsert({
    where: { userId_month: { userId, month } },
    update: { sections: sections as any, narrative, bankRecordId, narrativeSource },
    create: { userId, month, bankRecordId, sections: sections as any, narrative, narrativeSource },
  });

  const result: MonthlyDigest = {
    id: dbResult.id,
    userId: dbResult.userId,
    month: dbResult.month,
    bankRecordId: dbResult.bankRecordId,
    sections,
    narrative,
    narrativeSource,
    generatedAt: dbResult.generatedAt.toISOString(),
  };

  await redisSet(cacheKey, JSON.stringify(result), DIGEST_TTL_S);
  return result;
}

// ─── Aggregate all sections via existing cached services ──────

async function aggregateSections(
  userId: string,
  bankRecordId: string,
  month: string
): Promise<DigestSection> {
  const [budgetStatuses, goalsData, healthScore, merchants, incomeExpense] =
    await Promise.all([
      getBudgetStatus(userId, bankRecordId, month).catch(() => []),
      getGoals(userId).catch(() => []),
      getHealthScore(userId, bankRecordId, month),
      getMerchantInsights(bankRecordId, 1).catch(() => []),
      getIncomeVsExpense(bankRecordId, 1),
    ]);

  const goals = Array.isArray(goalsData) ? goalsData : [];
  const activeGoals = goals.filter((g: any) => g.status === 'active');
  const completedGoals = goals.filter((g: any) => g.status === 'completed');
  const totalSaved = goals.reduce((sum: number, g: any) => {
    return sum + parseFloat(g.savedAmount?.toString() || '0');
  }, 0);

  const budgetsWithLimits = budgetStatuses.filter((b: any) => b.monthlyLimit !== null);
  const overBudget = budgetStatuses.filter((b: any) => (b.percentUsed ?? 0) >= 100);

  return {
    budgetAdherence: {
      statuses: budgetStatuses as any,
      overBudgetCount: overBudget.length,
      totalBudgets: budgetsWithLimits.length,
    },
    goalProgress: {
      goals: goals as any,
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      totalSavedAmount: Math.round(totalSaved * 100) / 100,
    },
    healthScore,
    topMerchants: (merchants as any[]).slice(0, 5),
    incomeVsExpense: incomeExpense as any,
  };
}

// ─── Single Gemini call (~300 bytes of pre-aggregated metrics) ─

async function generateNarrative(sections: DigestSection, month: string): Promise<string> {
  const ie = sections.incomeVsExpense;
  const hs = sections.healthScore;
  const overBudget = sections.budgetAdherence.statuses
    .filter((b: any) => (b.percentUsed ?? 0) >= 100)
    .map((b: any) => b.category);
  const topMerchant = sections.topMerchants[0];

  const metrics = {
    month,
    totalIncome: ie.totals.totalIncome,
    totalExpenses: ie.totals.totalExpenses,
    netSavings: ie.totals.totalNet,
    healthScore: hs.score,
    savingsRate: hs.breakdown.savingsRate,
    budgetAdherence: hs.breakdown.budgetAdherence,
    overBudgetCategories: overBudget,
    totalBudgets: sections.budgetAdherence.totalBudgets,
    activeGoals: sections.goalProgress.activeCount,
    completedGoals: sections.goalProgress.completedCount,
    topMerchantName: topMerchant?.name,
    topMerchantSpend: topMerchant?.totalSpent,
  };

  const prompt = `You are a financial advisor writing a monthly digest for a banking customer.
Given these pre-computed metrics for ${month}, write a concise 3-4 paragraph narrative summary covering:
1. Overall financial health and spending patterns
2. Budget performance highlights (which categories went over/under)
3. Progress toward savings goals
4. 2-3 specific actionable recommendations for next month

Respond with plain text (NOT JSON). Be conversational but professional. Keep it under 200 words.

Metrics: ${JSON.stringify(metrics)}`;

  const result = await geminiModel.generateContent(prompt);
  return result.response.text().trim();
}

// ─── Local fallback narrative ─────────────────────────────────

function generateLocalNarrative(sections: DigestSection, month: string): string {
  const ie = sections.incomeVsExpense;
  const hs = sections.healthScore;
  const overCount = sections.budgetAdherence.overBudgetCount;
  const totalBudgets = sections.budgetAdherence.totalBudgets;

  const [y, m] = month.split('-');
  const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let narrative = `In ${monthName}, you earned $${ie.totals.totalIncome.toFixed(2)} and spent $${ie.totals.totalExpenses.toFixed(2)}`;
  narrative += ie.totals.totalNet >= 0
    ? `, saving $${ie.totals.totalNet.toFixed(2)} net. `
    : `, with a deficit of $${Math.abs(ie.totals.totalNet).toFixed(2)}. `;
  narrative += `Your financial health score is ${hs.score}/100.\n\n`;

  if (totalBudgets > 0) {
    narrative += overCount > 0
      ? `${overCount} of ${totalBudgets} budgets exceeded their limits this month. Consider reviewing your spending in those categories.\n\n`
      : `All ${totalBudgets} budgets stayed within limits — great discipline!\n\n`;
  }

  if (sections.goalProgress.activeCount > 0) {
    narrative += `You have ${sections.goalProgress.activeCount} active savings goal${sections.goalProgress.activeCount > 1 ? 's' : ''} with $${sections.goalProgress.totalSavedAmount.toFixed(2)} saved so far. `;
  }
  if (sections.goalProgress.completedCount > 0) {
    narrative += `${sections.goalProgress.completedCount} goal${sections.goalProgress.completedCount > 1 ? 's have' : ' has'} been completed. `;
  }

  if (sections.topMerchants.length > 0) {
    const top = sections.topMerchants[0];
    narrative += `\n\nYour top merchant was ${top.name} at $${top.totalSpent.toFixed(2)} across ${top.transactionCount} transactions.`;
  }

  return narrative.trim();
}

// ─── PDF Generation ──────────────────────────────────────────

export async function generateDigestPDF(digest: MonthlyDigest): Promise<Buffer> {
  const { sections, narrative, month } = digest;
  const [y, m] = month.split('-');
  const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(22).fillColor('#1e293b').text(`Monthly Financial Digest`, { align: 'center' });
    doc.fontSize(12).fillColor('#64748b').text(monthName, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    // Health Score
    doc.fontSize(14).fillColor('#1e293b').text('Financial Health Score');
    doc.moveDown(0.3);
    const scoreColor = sections.healthScore.score >= 70 ? '#10b981' : sections.healthScore.score >= 40 ? '#f59e0b' : '#ef4444';
    doc.fontSize(28).fillColor(scoreColor).text(`${sections.healthScore.score}/100`, { align: 'center' });
    doc.moveDown(0.5);

    // Narrative
    doc.fontSize(14).fillColor('#1e293b').text('AI Summary');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#334155').text(narrative, { lineGap: 3 });
    doc.moveDown(1);

    // Income vs Expense
    const ie = sections.incomeVsExpense;
    doc.fontSize(14).fillColor('#1e293b').text('Income vs Expenses');
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.fillColor('#10b981').text(`Total Income: $${ie.totals.totalIncome.toFixed(2)}`);
    doc.fillColor('#ef4444').text(`Total Expenses: $${ie.totals.totalExpenses.toFixed(2)}`);
    const netColor = ie.totals.totalNet >= 0 ? '#10b981' : '#ef4444';
    doc.fillColor(netColor).text(`Net Savings: $${ie.totals.totalNet.toFixed(2)}`);
    doc.moveDown(1);

    // Budget Adherence
    if (sections.budgetAdherence.totalBudgets > 0) {
      doc.fontSize(14).fillColor('#1e293b').text('Budget Performance');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#334155');
      for (const b of sections.budgetAdherence.statuses.slice(0, 8)) {
        if (b.monthlyLimit === null) continue;
        const pct = b.percentUsed ?? 0;
        const statusColor = pct >= 100 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981';
        doc.fillColor(statusColor).text(`${b.category}: $${b.spent.toFixed(2)} / $${b.monthlyLimit.toFixed(2)} (${pct.toFixed(0)}%)`);
      }
      doc.moveDown(1);
    }

    // Top Merchants
    if (sections.topMerchants.length > 0) {
      doc.fontSize(14).fillColor('#1e293b').text('Top Merchants');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#334155');
      for (const m of sections.topMerchants) {
        doc.text(`${m.name} — $${m.totalSpent.toFixed(2)} (${m.transactionCount} txns)`);
      }
      doc.moveDown(1);
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(7).fillColor('#94a3b8')
      .text(`Generated on ${new Date().toLocaleDateString('en-US')}`, { align: 'center' });

    doc.end();
  });
}
