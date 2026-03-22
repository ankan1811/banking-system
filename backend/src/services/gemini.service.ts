import { createHash } from 'crypto';
import { geminiModel } from '../lib/gemini.js';
import { getAccounts, getAccount, getAllUserTransactions } from './bank.service.js';
import { getGoals } from './goals.service.js';
import { redisGet, redisSet, redisDel } from '../lib/redis.js';
import type { AICategory, SpendingInsight, ChatMessage, FinancialPlan, PlanMilestone } from '@shared/types';

// ─── Helpers ────────────────────────────────────────────────

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

// ─── 1. Transaction Categorization (rule-based, no API call) ─

type RawTransaction = {
  id: string;
  name: string;
  amount: number;
  date: string;
  merchantName?: string;
  category?: string;
  [key: string]: any;
};

function mapCategory(name: string, plaidCategory: string): AICategory {
  const text = `${name} ${plaidCategory}`.toLowerCase();
  if (/food|restaurant|dining|coffee|cafe|starbucks|mcdonald|burger|pizza|grocery|bakery|bar|pub|swiggy|zomato|dominos|dunzo|blinkit|bigbasket|dmart|zepto|instamart|eatsure|faasos/.test(text)) return 'Food & Dining';
  if (/airline|flight|uber|lyft|taxi|transit|train|bus|travel|hotel|airbnb|parking|ola|rapido|irctc|metro|fastag|redbus|makemytrip|goibibo/.test(text))               return 'Transport';
  if (/shopping|amazon|retail|mall|store|merchandise|clothing|fashion|electronics|sparkfun|flipkart|myntra|ajio|meesho|nykaa|tata.*cliq|reliance|croma|snapdeal/.test(text))        return 'Shopping';
  if (/entertainment|netflix|spotify|movie|cinema|game|sport|concert|recreation|hotstar|jiocinema|prime.*video|bookmyshow|inox|pvr|zee5|sonyliv/.test(text))                   return 'Entertainment';
  if (/utility|utilities|electric|gas|water|internet|phone|insurance|bill|subscription|jio|airtel|vodafone|\bvi\b|bsnl|bescom|broadband|dth|tata.*power|gas.*bill|lic|bajaj.*allianz/.test(text))            return 'Bills & Utilities';
  if (/health|medical|pharmacy|doctor|hospital|dental|gym|fitness|apollo|medplus|pharmeasy|netmeds|practo|1mg/.test(text))                                 return 'Health';
  if (/education|school|university|tuition|course|book|learning|byju|unacademy|upgrad|coursera|udemy/.test(text))                                   return 'Education';
  if (/income|payroll|salary|direct deposit|dividend|interest income|credited|int\.cr|interest.*credited/.test(text))                              return 'Income';
  if (/transfer|payment|zelle|venmo|paypal|wire|upi|neft|rtgs|imps|nach|ecs|mandate|fund.*transfer/.test(text))                                                   return 'Transfers';
  return 'Other';
}

export function categorizeTransactions(
  transactions: RawTransaction[]
): (RawTransaction & { aiCategory: AICategory })[] {
  return transactions.map((t) => ({
    ...t,
    aiCategory: mapCategory(t.merchantName || t.name, t.category || ''),
  }));
}

// ─── 2. Spending Insights ───────────────────────────────────

type CategorizedTransaction = RawTransaction & { aiCategory: AICategory };

const INSIGHTS_TTL_S = 100 * 60 * 60; // 100 hours in seconds

export async function generateSpendingInsights(
  transactions: CategorizedTransaction[],
  currentMonth: string, // "YYYY-MM"
  userId: string,
  useAi: boolean = false
): Promise<SpendingInsight> {
  const cacheKey = `insights:${userId}:${currentMonth}`;

  // useAi=true clears cache so Gemini is always called
  if (useAi) await redisDel(cacheKey);

  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as SpendingInsight;

  // Pre-aggregate data
  const [year, month] = currentMonth.split('-').map(Number);
  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;

  const currentTxns = transactions.filter((t) => t.date?.startsWith(currentMonth));
  const prevTxns = transactions.filter((t) => t.date?.startsWith(prevMonth));

  const aggregate = (txns: CategorizedTransaction[]) => {
    const map: Record<string, { amount: number; count: number }> = {};
    for (const t of txns) {
      if (t.amount <= 0) continue; // skip credits/income for spending
      const cat = t.aiCategory;
      if (!map[cat]) map[cat] = { amount: 0, count: 0 };
      map[cat].amount += Math.abs(t.amount);
      map[cat].count++;
    }
    return map;
  };

  const currentAgg = aggregate(currentTxns);
  const prevAgg = aggregate(prevTxns);

  const topTxns = [...currentTxns]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5)
    .map((t) => ({ name: t.name, amount: t.amount, category: t.aiCategory, date: t.date }));

  // useAi=false: skip Gemini, use formula fallback
  if (!useAi) {
    const fallback = computeInsightsFallback(currentAgg, prevAgg, currentTxns, topTxns, currentMonth);
    await redisSet(cacheKey, JSON.stringify(fallback), 5 * 60);
    return fallback;
  }

  // useAi=true: call Gemini
  const prompt = `You are a friendly financial advisor. Given the following spending summary, provide:
1. A 2-3 sentence natural language summary of overall spending patterns.
2. Month-over-month comparison highlights (which categories increased/decreased).
3. Top spending categories with observations.
4. Any unusual spikes or patterns worth noting.
5. 2-3 actionable savings tips based on the data.

Respond ONLY with valid JSON matching this exact structure:
{
  "summary": "string",
  "monthComparison": [{ "category": "string", "currentAmount": number, "previousAmount": number, "changePercent": number }],
  "topCategories": [{ "category": "string", "amount": number, "transactionCount": number }],
  "anomalies": ["string"],
  "savingsTips": ["string"]
}

Current month (${currentMonth}) spending by category: ${JSON.stringify(currentAgg)}
Previous month (${prevMonth}) spending by category: ${JSON.stringify(prevAgg)}
Top 5 transactions this month: ${JSON.stringify(topTxns)}
Total transactions this month: ${currentTxns.length}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(extractJSON(text));

    const insight: SpendingInsight = {
      summary: parsed.summary || 'No spending data available for analysis.',
      monthComparison: parsed.monthComparison || [],
      topCategories: parsed.topCategories || [],
      anomalies: parsed.anomalies || [],
      savingsTips: parsed.savingsTips || [],
      generatedAt: new Date().toISOString(),
      source: 'ai',
    };

    await redisSet(cacheKey, JSON.stringify(insight), INSIGHTS_TTL_S);
    return insight;
  } catch (err) {
    console.error('Gemini insights error:', err);
    const fallback = computeInsightsFallback(currentAgg, prevAgg, currentTxns, topTxns, currentMonth);
    await redisSet(cacheKey, JSON.stringify(fallback), 5 * 60);
    return fallback;
  }
}

function computeInsightsFallback(
  currentAgg: Record<string, { amount: number; count: number }>,
  prevAgg: Record<string, { amount: number; count: number }>,
  currentTxns: CategorizedTransaction[],
  topTxns: { name: string; amount: number; category: string; date: string }[],
  currentMonth: string
): SpendingInsight {
  const totalCurrent = Object.values(currentAgg).reduce((s, v) => s + v.amount, 0);
  const totalPrev = Object.values(prevAgg).reduce((s, v) => s + v.amount, 0);

  const allCategories = new Set([...Object.keys(currentAgg), ...Object.keys(prevAgg)]);
  const monthComparison = [...allCategories].map((category) => {
    const cur = currentAgg[category]?.amount ?? 0;
    const prev = prevAgg[category]?.amount ?? 0;
    const changePercent = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
    return { category, currentAmount: Math.round(cur * 100) / 100, previousAmount: Math.round(prev * 100) / 100, changePercent };
  }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const topCategories = Object.entries(currentAgg)
    .map(([category, { amount, count }]) => ({ category, amount: Math.round(amount * 100) / 100, transactionCount: count }))
    .sort((a, b) => b.amount - a.amount);

  const anomalies: string[] = [];
  for (const mc of monthComparison) {
    if (mc.previousAmount > 0 && mc.changePercent > 50) {
      anomalies.push(`${mc.category} spending jumped ${mc.changePercent}% vs last month ($${mc.previousAmount} → $${mc.currentAmount}).`);
    }
  }
  const avgTxnAmount = totalCurrent / Math.max(currentTxns.length, 1);
  for (const t of topTxns) {
    if (Math.abs(t.amount) > avgTxnAmount * 3) {
      anomalies.push(`Unusually large transaction: ${t.name} ($${Math.abs(t.amount).toFixed(2)}) on ${t.date}.`);
    }
  }

  const savingsTips: string[] = [];
  if (topCategories.length > 0) {
    savingsTips.push(`Your top spending category is ${topCategories[0].category} at $${topCategories[0].amount}. Look for ways to reduce discretionary spending here.`);
  }
  const biggestIncrease = monthComparison.find((mc) => mc.changePercent > 0 && mc.previousAmount > 0);
  if (biggestIncrease) {
    savingsTips.push(`${biggestIncrease.category} increased ${biggestIncrease.changePercent}% this month — consider setting a budget cap for this category.`);
  }
  if (totalCurrent > totalPrev && totalPrev > 0) {
    const overallIncrease = Math.round(((totalCurrent - totalPrev) / totalPrev) * 100);
    savingsTips.push(`Overall spending is up ${overallIncrease}% from last month ($${totalPrev.toFixed(2)} → $${totalCurrent.toFixed(2)}). Review recurring subscriptions and discretionary purchases.`);
  } else if (totalPrev > 0) {
    savingsTips.push(`Great job — your spending decreased from $${totalPrev.toFixed(2)} to $${totalCurrent.toFixed(2)} this month. Keep it up!`);
  }

  const changeDir = totalPrev > 0
    ? totalCurrent > totalPrev ? `up ${Math.round(((totalCurrent - totalPrev) / totalPrev) * 100)}%` : `down ${Math.round(((totalPrev - totalCurrent) / totalPrev) * 100)}%`
    : '';
  const summary = `You spent $${totalCurrent.toFixed(2)} across ${currentTxns.length} transactions in ${currentMonth}${totalPrev > 0 ? `, ${changeDir} from $${totalPrev.toFixed(2)} last month` : ''}. ${topCategories.length > 0 ? `Your biggest category was ${topCategories[0].category} ($${topCategories[0].amount}).` : ''}`;

  return {
    summary,
    monthComparison,
    topCategories,
    anomalies: anomalies.slice(0, 3),
    savingsTips: savingsTips.slice(0, 3),
    generatedAt: new Date().toISOString(),
    source: 'formula',
  };
}

// ─── 3. Financial Plan Generator ─────────────────────────────

const FIN_PLAN_TTL_S = 24 * 60 * 60; // 24 hours

export async function generateFinancialPlan(
  description: string,
  userId: string
): Promise<FinancialPlan> {
  const descHash = createHash('md5').update(description.toLowerCase().trim()).digest('hex');
  const cacheKey = `fin-plan:${userId}:${descHash}`;
  const raw = await redisGet(cacheKey);
  if (raw) return JSON.parse(raw) as FinancialPlan;

  // ── Gather financial context ──────────────────────────────
  const transactions = await getAllUserTransactions(userId);
  const { totalCurrentBalance } = await getAccounts(userId);
  const existingGoals = await getGoals(userId);
  const activeGoals = existingGoals.filter((g: any) => g.status === 'active');

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

  const recentTxns = (transactions || []).filter((t: any) => t.date >= threeMonthsAgoStr);
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const t of recentTxns) {
    if (t.amount < 0) totalIncome += Math.abs(t.amount);
    else totalExpenses += t.amount;
  }
  const avgMonthlyIncome = Math.round((totalIncome / 3) * 100) / 100;
  const avgMonthlyExpenses = Math.round((totalExpenses / 3) * 100) / 100;
  const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;

  const totalGoalCommitments = activeGoals.reduce((s: number, g: any) => {
    const remaining = parseFloat(g.targetAmount.toString()) - parseFloat(g.savedAmount.toString());
    return s + Math.max(remaining, 0);
  }, 0);

  // ── Gemini prompt ─────────────────────────────────────────
  const prompt = `You are a financial planner. Based on the user's financial situation, create a detailed savings plan for their described goal.

User's goal description: "${description}"
Today's date: ${now.toISOString().split('T')[0]}

Financial context:
- Total balance across all accounts: $${totalCurrentBalance.toFixed(2)}
- Average monthly income: $${avgMonthlyIncome}
- Average monthly expenses: $${avgMonthlyExpenses}
- Average monthly net savings: $${avgMonthlySavings.toFixed(2)}
- Active savings goals: ${activeGoals.length} (total remaining: $${totalGoalCommitments.toFixed(2)})
${activeGoals.map((g: any) => `  - ${g.name}: $${parseFloat(g.savedAmount.toString()).toFixed(2)} / $${parseFloat(g.targetAmount.toString()).toFixed(2)}`).join('\n')}

Respond ONLY with valid JSON:
{
  "goalName": "short name for the goal",
  "targetAmount": number,
  "targetDate": "YYYY-MM-DD",
  "monthlySavingsNeeded": number,
  "milestones": [{ "month": "YYYY-MM", "targetSaved": number, "action": "what to do this month" }],
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "feasibility": "easy|moderate|challenging|very_challenging",
  "suggestedEmoji": "single emoji",
  "suggestedColor": "hex color string"
}

Rules:
- Infer the target amount and timeline from the description. If not specified, suggest reasonable defaults.
- The targetDate should be realistic given their savings capacity.
- Create 3-6 milestones spread evenly across the timeline.
- Feasibility: easy (<25% of monthly surplus), moderate (25-50%), challenging (50-75%), very_challenging (>75%).
- Account for existing goal commitments when assessing feasibility.
- Tips should be specific and actionable.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(extractJSON(text));

    const plan: FinancialPlan = {
      goalName: parsed.goalName || description.slice(0, 40),
      targetAmount: parsed.targetAmount || 1000,
      targetDate: parsed.targetDate || '',
      monthlySavingsNeeded: parsed.monthlySavingsNeeded || 0,
      milestones: parsed.milestones || [],
      tips: parsed.tips || [],
      feasibility: parsed.feasibility || 'moderate',
      suggestedEmoji: parsed.suggestedEmoji || '🎯',
      suggestedColor: parsed.suggestedColor || '#8b5cf6',
      generatedAt: new Date().toISOString(),
    };

    await redisSet(cacheKey, JSON.stringify(plan), FIN_PLAN_TTL_S);
    return plan;
  } catch (err) {
    console.error('Gemini financial plan error:', err);

    // ── Formula-based fallback ────────────────────────────────
    const amountMatch = description.match(/\$?([\d,]+(?:\.\d+)?)/);
    const targetAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 1000;

    let targetMonths = 12;
    const monthsMatch = description.match(/(\d+)\s*months?/i);
    const yearsMatch = description.match(/(\d+)\s*years?/i);
    if (monthsMatch) targetMonths = parseInt(monthsMatch[1]);
    else if (yearsMatch) targetMonths = parseInt(yearsMatch[1]) * 12;

    const monthlySavingsNeeded = Math.round((targetAmount / targetMonths) * 100) / 100;

    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + targetMonths);

    // Generate milestones
    const milestoneInterval = Math.max(1, Math.floor(targetMonths / 5));
    const milestones: PlanMilestone[] = [];
    for (let i = milestoneInterval; i <= targetMonths; i += milestoneInterval) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      milestones.push({
        month: d.toISOString().slice(0, 7),
        targetSaved: Math.round((targetAmount / targetMonths) * i * 100) / 100,
        action: i >= targetMonths
          ? 'Final milestone — goal complete!'
          : `Save $${monthlySavingsNeeded}/month. You should have $${Math.round((targetAmount / targetMonths) * i)} saved by now.`,
      });
    }

    // Feasibility
    const savingsRatio = avgMonthlySavings > 0 ? monthlySavingsNeeded / avgMonthlySavings : 1;
    const feasibility = savingsRatio < 0.25 ? 'easy' : savingsRatio < 0.5 ? 'moderate' : savingsRatio < 0.75 ? 'challenging' : 'very_challenging';

    // Tips based on feasibility
    const tips: string[] = [];
    if (feasibility === 'easy') {
      tips.push(`At $${monthlySavingsNeeded}/month, this is well within your savings capacity.`);
      tips.push('Consider automating a monthly transfer to a dedicated savings account.');
    } else if (feasibility === 'moderate') {
      tips.push(`You'll need to save about ${Math.round(savingsRatio * 100)}% of your current monthly surplus.`);
      tips.push('Look for discretionary spending (Shopping, Entertainment) to cut back on.');
    } else {
      tips.push(`This goal requires saving ${Math.round(savingsRatio * 100)}% of your current surplus — consider extending the timeline.`);
      tips.push('Reducing your top spending category could free up the needed funds.');
    }
    tips.push(`Your current monthly net savings is $${avgMonthlySavings.toFixed(2)}.`);

    const goalName = description.length > 40 ? description.slice(0, 40) + '...' : description;

    const fallback: FinancialPlan = {
      goalName,
      targetAmount,
      targetDate: targetDate.toISOString().split('T')[0],
      monthlySavingsNeeded,
      milestones,
      tips,
      feasibility,
      suggestedEmoji: '🎯',
      suggestedColor: '#8b5cf6',
      generatedAt: new Date().toISOString(),
    };

    await redisSet(cacheKey, JSON.stringify(fallback), 5 * 60);
    return fallback;
  }
}

// ─── 4. AI Chatbot ──────────────────────────────────────────

const CHAT_CONTEXT_TTL_S = 100 * 60 * 60; // 100 hours in seconds

async function buildFinancialContext(userId: string): Promise<string> {
  const cacheKey = `chat-context:${userId}`;
  const raw = await redisGet(cacheKey);
  if (raw) {
    console.log(`[CACHE HIT] chat context for ${userId}`);
    return raw;
  }

  const { data: accounts, totalBanks, totalCurrentBalance } = await getAccounts(userId);

  const accountDetails = await Promise.all(
    accounts.slice(0, 3).map(async (account: any) => {
      try {
        const { transactions } = await getAccount(account.bankRecordId);
        return {
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          currentBalance: account.currentBalance,
          availableBalance: account.availableBalance,
          recentTransactions: (transactions || []).slice(0, 30).map((t: any) => ({
            name: t.name,
            amount: t.amount,
            category: t.aiCategory || t.category,
            date: t.date,
            type: t.type,
          })),
        };
      } catch {
        return {
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          currentBalance: account.currentBalance,
          availableBalance: account.availableBalance,
          recentTransactions: [],
        };
      }
    })
  );

  const context = `
FINANCIAL SUMMARY:
- Total linked banks: ${totalBanks}
- Total current balance across all accounts: $${totalCurrentBalance.toFixed(2)}

ACCOUNT DETAILS:
${accountDetails.map((a) => `
Account: ${a.name} (${a.type}/${a.subtype})
  Current Balance: $${a.currentBalance.toFixed(2)}
  Available Balance: $${a.availableBalance.toFixed(2)}
  Recent Transactions (${a.recentTransactions.length}):
${a.recentTransactions.map((t: any) => `    - ${t.date}: ${t.name} | $${t.amount} | ${t.category} | ${t.type}`).join('\n')}
`).join('\n')}
  `.trim();

  await redisSet(cacheKey, context, CHAT_CONTEXT_TTL_S);
  return context;
}

const SYSTEM_PROMPT = `You are a helpful financial assistant for a banking application called "Ankan's Bank".
You have access to the user's financial data shown below. Use it to provide personalized, actionable financial insights.

Rules:
- Only answer questions related to the user's finances, banking, budgeting, and general financial literacy.
- Never reveal raw account IDs, access tokens, or internal system identifiers.
- If asked about data you don't have, say so honestly.
- Format currency amounts with $ and two decimal places.
- Be concise but thorough. Use bullet points for clarity when listing multiple items.
- If the user asks to perform an action (transfer money, etc.), explain that you can only provide information and they should use the app's features to take action.

USER'S FINANCIAL DATA:
`;

export async function chat(
  userId: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const financialContext = await buildFinancialContext(userId);

  const chatSession = geminiModel.startChat({
    history: [
      { role: 'user', parts: [{ text: 'Initialize financial assistant' }] },
      { role: 'model', parts: [{ text: SYSTEM_PROMPT + financialContext }] },
      ...history.map((m) => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.content }],
      })),
    ],
  });

  const result = await chatSession.sendMessage(userMessage);
  return result.response.text();
}
