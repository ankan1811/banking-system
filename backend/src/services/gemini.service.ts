import { geminiModel } from '../lib/gemini.js';
import { getAccounts, getAccount } from './bank.service.js';
import { redisGet, redisSet } from '../lib/redis.js';
import type { AICategory, SpendingInsight, ChatMessage } from '@shared/types';

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
  if (/food|restaurant|dining|coffee|cafe|starbucks|mcdonald|burger|pizza|grocery|bakery|bar|pub/.test(text)) return 'Food & Dining';
  if (/airline|flight|uber|lyft|taxi|transit|train|bus|travel|hotel|airbnb|parking/.test(text))               return 'Transport';
  if (/shopping|amazon|retail|mall|store|merchandise|clothing|fashion|electronics|sparkfun/.test(text))        return 'Shopping';
  if (/entertainment|netflix|spotify|movie|cinema|game|sport|concert|recreation/.test(text))                   return 'Entertainment';
  if (/utility|utilities|electric|gas|water|internet|phone|insurance|bill|subscription/.test(text))            return 'Bills & Utilities';
  if (/health|medical|pharmacy|doctor|hospital|dental|gym|fitness/.test(text))                                 return 'Health';
  if (/education|school|university|tuition|course|book|learning/.test(text))                                   return 'Education';
  if (/income|payroll|salary|direct deposit|dividend|interest income/.test(text))                              return 'Income';
  if (/transfer|payment|zelle|venmo|paypal|wire/.test(text))                                                   return 'Transfers';
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

const INSIGHTS_TTL_S = 24 * 60 * 60; // 24 hours in seconds

export async function generateSpendingInsights(
  transactions: CategorizedTransaction[],
  currentMonth: string, // "YYYY-MM"
  userId: string
): Promise<SpendingInsight> {
  const cacheKey = `insights:${userId}:${currentMonth}`;
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

    await redisSet(cacheKey, JSON.stringify(insight), INSIGHTS_TTL_S);
    return insight;
  } catch (err) {
    console.error('Gemini insights error:', err);

    // Cache the fallback so we stop hammering Gemini while rate-limited.
    // Use a shorter TTL (5 minutes) so it auto-retries after cooldown.
    const fallback: SpendingInsight = {
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
    await redisSet(cacheKey, JSON.stringify(fallback), 5 * 60);
    return fallback;
  }
}

// ─── 3. AI Chatbot ──────────────────────────────────────────

const CHAT_CONTEXT_TTL_S = 24 * 60 * 60; // 24 hours in seconds

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
