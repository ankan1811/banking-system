import { createHash } from 'crypto';
import { geminiModel } from '../lib/gemini.js';
import { prisma } from '../lib/db.js';
import { getAccounts, getAccount } from './bank.service.js';
import type { AICategory, SpendingInsight, ChatMessage } from '@shared/types';

const AI_CATEGORIES: AICategory[] = [
  'Food & Dining', 'Transport', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Health', 'Education', 'Income', 'Transfers', 'Other',
];

// ─── Helpers ────────────────────────────────────────────────

function hashTransaction(name: string, amount: number, date: string): string {
  return createHash('sha256').update(`${name}|${amount}|${date}`).digest('hex');
}

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

// ─── 1. Transaction Categorization ──────────────────────────

type RawTransaction = {
  id: string;
  name: string;
  amount: number;
  date: string;
  merchantName?: string;
  [key: string]: any;
};

export async function categorizeTransactions(
  transactions: RawTransaction[]
): Promise<(RawTransaction & { aiCategory: AICategory })[]> {
  if (!transactions.length) return [];

  // Compute hashes and check DB cache
  const withHashes = transactions.map((t) => ({
    ...t,
    hash: hashTransaction(t.name, t.amount, t.date),
  }));

  const hashes = withHashes.map((t) => t.hash);
  const cached = await prisma.cachedCategory.findMany({
    where: { transactionHash: { in: hashes } },
  });
  const cacheMap = new Map(cached.map((c) => [c.transactionHash, c.aiCategory as AICategory]));

  // Split into cached and uncached
  const uncached = withHashes.filter((t) => !cacheMap.has(t.hash));

  // Batch uncached txns to Gemini (50 per call)
  const BATCH_SIZE = 50;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const prompt = `You are a financial transaction categorizer. Categorize each transaction into exactly one of these categories:
${AI_CATEGORIES.join(', ')}.

Respond ONLY with a valid JSON array. Each element must have "index" (number) and "category" (string matching one of the categories above exactly).

Transactions:
${JSON.stringify(batch.map((t, idx) => ({ index: idx, name: t.merchantName || t.name, amount: t.amount, date: t.date })))}`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text();
      const parsed: { index: number; category: string }[] = JSON.parse(extractJSON(text));

      const toCreate: { transactionHash: string; originalName: string; aiCategory: string }[] = [];
      for (const item of parsed) {
        const txn = batch[item.index];
        if (!txn) continue;
        const category = AI_CATEGORIES.includes(item.category as AICategory)
          ? (item.category as AICategory)
          : 'Other';
        cacheMap.set(txn.hash, category);
        toCreate.push({
          transactionHash: txn.hash,
          originalName: txn.name,
          aiCategory: category,
        });
      }

      if (toCreate.length) {
        await prisma.cachedCategory.createMany({ data: toCreate, skipDuplicates: true });
      }
    } catch (err) {
      console.error('Gemini categorization error:', err);
      // Fallback: mark uncategorized as 'Other'
      for (const txn of batch) {
        if (!cacheMap.has(txn.hash)) cacheMap.set(txn.hash, 'Other');
      }
    }
  }

  return withHashes.map((t) => ({
    ...t,
    aiCategory: cacheMap.get(t.hash) || 'Other',
  }));
}

// ─── 2. Spending Insights ───────────────────────────────────

type CategorizedTransaction = RawTransaction & { aiCategory: AICategory };

// Simple in-memory cache: key = `${userId}:${month}` → { data, expiresAt }
const insightsCache = new Map<string, { data: SpendingInsight; expiresAt: number }>();
const INSIGHTS_TTL = 5 * 60 * 1000; // 5 minutes

export async function generateSpendingInsights(
  transactions: CategorizedTransaction[],
  currentMonth: string, // "YYYY-MM"
  userId: string
): Promise<SpendingInsight> {
  const cacheKey = `${userId}:${currentMonth}`;
  const cached = insightsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

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
    };

    insightsCache.set(cacheKey, { data: insight, expiresAt: Date.now() + INSIGHTS_TTL });
    return insight;
  } catch (err) {
    console.error('Gemini insights error:', err);
    return {
      summary: 'Unable to generate insights at this time. Please try again later.',
      monthComparison: [],
      topCategories: Object.entries(currentAgg).map(([category, { amount, count }]) => ({
        category,
        amount,
        transactionCount: count,
      })),
      anomalies: [],
      savingsTips: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

// ─── 3. AI Chatbot ──────────────────────────────────────────

async function buildFinancialContext(userId: string): Promise<string> {
  const { data: accounts, totalBanks, totalCurrentBalance } = await getAccounts(userId);

  const accountDetails = await Promise.all(
    accounts.slice(0, 3).map(async (account) => {
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

  return `
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
