import { createHash } from 'crypto';
import { CountryCode } from 'plaid';
import { plaidClient } from '../lib/plaid.js';
import { getBanks as getBanksFromDb, getBank as getBankFromDb } from './user.service.js';
import { getTransactionsByBankId, getTransferAdjustments } from './transaction.service.js';
import { categorizeTransactions } from './gemini.service.js';
import { evaluateAlerts } from './alerts.service.js';
import { prisma } from '../lib/db.js';
import { redisGet, redisSet, redisDel, redisDelByPrefix } from '../lib/redis.js';

// ─── Constants ──────────────────────────────────────────────

const PLAID_SYNC_TTL_S = 24 * 60 * 60; // 24 hours in seconds

// ─── Institution Cache (in-memory, static data) ─────────────

type CacheEntry<T> = { data: T; expiresAt: number };
const institutionCache = new Map<string, CacheEntry<any>>();
const INSTITUTION_TTL = 100 * 60 * 60 * 1000; // 100 hours

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── Transaction Hash (shared with gemini.service for note lookups) ───

export function hashTransaction(name: string, amount: number, date: string): string {
  return createHash('sha256').update(`${name}|${amount}|${date}`).digest('hex');
}

// ─── syncBankFromPlaid (single function for all Plaid calls) ─

export async function syncBankFromPlaid(bank: { id: string; accessToken: string; accountId: string }) {
  console.log(`[PLAID SYNC] Starting sync for bank ${bank.id}`);

  // 1. Fetch live balances + account metadata
  const accountsResponse = await plaidClient.accountsGet({ access_token: bank.accessToken });
  const raw = accountsResponse.data.accounts[0];
  const institutionId = accountsResponse.data.item.institution_id;

  let institutionName: string | undefined;
  if (institutionId) {
    try {
      const institution = await getInstitution(institutionId);
      institutionName = institution.name;
    } catch {}
  }

  // 2. Update bank record with fresh balances
  await prisma.bank.update({
    where: { id: bank.id },
    data: {
      availableBalance: raw.balances.available,
      currentBalance: raw.balances.current,
      institutionName,
      institutionId: institutionId ?? undefined,
      accountName: raw.name,
      officialName: raw.official_name,
      mask: raw.mask,
      accountType: raw.type as string,
      accountSubtype: raw.subtype as string ?? undefined,
      lastSyncedAt: new Date(),
    },
  });

  // 3. Sync transactions
  await getTransactions(bank.accessToken, bank.id);

  // 4. Set Redis TTL key — no Plaid calls until this expires
  await redisSet(`plaid-sync:${bank.id}`, '1', PLAID_SYNC_TTL_S);

  console.log(`[PLAID SYNC] Completed for bank ${bank.id}, next sync in 24h`);
}

// ─── Background sync trigger (non-blocking) ─────────────────

async function triggerSyncIfNeeded(bank: { id: string; accessToken: string | null; accountId: string; source?: string }) {
  // Manual banks have no Plaid access token — nothing to sync
  if (!bank.accessToken || bank.source === 'manual') return;

  const syncKey = `plaid-sync:${bank.id}`;
  const exists = await redisGet(syncKey);
  if (exists) return; // still fresh

  // Fire in background, don't block the response
  syncBankFromPlaid(bank as { id: string; accessToken: string; accountId: string }).catch((err) =>
    console.error(`Background Plaid sync failed for bank ${bank.id}:`, err)
  );
}

// ─── getAllUserTransactions (aggregate across all banks) ──────

export async function getAllUserTransactions(userId: string) {
  const banks = await prisma.bank.findMany({
    where: { userId },
    select: { id: true, accountId: true },
  });
  const bankIds = banks.map((b) => b.id);
  if (bankIds.length === 0) return [];

  const dbRows = await prisma.plaidTransaction.findMany({
    where: { bankId: { in: bankIds } },
    orderBy: { date: 'desc' },
  });

  return dbRows.map((t) => ({
    id: t.id,
    name: t.name,
    merchantName: t.merchantName,
    paymentChannel: t.paymentChannel,
    type: t.type,
    accountId: t.accountId,
    amount: parseFloat(t.amount.toString()),
    pending: t.pending,
    category: t.category,
    aiCategory: t.category,
    date: t.date,
    createdAt: t.syncedAt?.toISOString() || t.date,
    image: t.image,
  }));
}

// ─── getAccounts (DB-only reads) ─────────────────────────────

export const getAccounts = async (userId: string) => {
  const banks = await getBanksFromDb(userId);

  // Compute net transfer adjustments for all banks in one batch
  const bankIds = banks.map((b) => b.id);
  const adjustments = await getTransferAdjustments(bankIds);

  const accounts = banks.map((bank) => {
    const adj = adjustments.get(bank.id) || 0;
    return {
      id: bank.accountId,
      availableBalance: (bank.availableBalance ? parseFloat(bank.availableBalance.toString()) : 0) + adj,
      currentBalance: (bank.currentBalance ? parseFloat(bank.currentBalance.toString()) : 0) + adj,
      institutionId: bank.institutionId || '',
      name: bank.accountName || bank.accountId,
      officialName: bank.officialName,
      mask: bank.mask || '',
      type: bank.accountType || 'depository',
      subtype: bank.accountSubtype || 'checking',
      bankRecordId: bank.id,
      shareableId: bank.shareableId,
    };
  });

  const totalBanks = accounts.length;
  const totalCurrentBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  // Trigger background syncs for any banks with expired TTL
  for (const bank of banks) {
    triggerSyncIfNeeded(bank);
  }

  return { data: accounts, totalBanks, totalCurrentBalance };
};

// ─── getAccount (DB-only reads) ──────────────────────────────

export const getAccount = async (bankRecordId: string, userId: string) => {
  const bank = await prisma.bank.findFirst({ where: { id: bankRecordId, userId } });
  if (!bank) throw new Error('Bank not found');

  // Build account data from DB columns
  const account = {
    id: bank.accountId,
    availableBalance: bank.availableBalance ? parseFloat(bank.availableBalance.toString()) : 0,
    currentBalance: bank.currentBalance ? parseFloat(bank.currentBalance.toString()) : 0,
    institutionId: bank.institutionId || '',
    name: bank.accountName || bank.accountId,
    officialName: bank.officialName,
    mask: bank.mask || '',
    type: bank.accountType || 'depository',
    subtype: bank.accountSubtype || 'checking',
    bankRecordId: bank.id,
  };

  // Get in-app transfers and compute balance adjustment
  const transferTransactionsData = await getTransactionsByBankId(bank.id);

  let transferAdjustment = 0;
  for (const t of transferTransactionsData.documents) {
    const amt = typeof t.amount === 'object' ? parseFloat(t.amount.toString()) : Number(t.amount);
    if (t.senderBankId === bank.id) transferAdjustment -= amt;
    else transferAdjustment += amt;
  }
  account.availableBalance += transferAdjustment;
  account.currentBalance += transferAdjustment;

  const transferTransactions = transferTransactionsData.documents.map(
    (transferData: any) => ({
      id: transferData.id,
      name: transferData.name!,
      merchantName: transferData.name!,
      amount: typeof transferData.amount === 'object'
        ? parseFloat(transferData.amount.toString())
        : transferData.amount,
      date: transferData.createdAt,
      paymentChannel: 'online',
      channel: transferData.channel,
      category: transferData.category,
      aiCategory: 'Transfers',
      type: transferData.senderBankId === bank.id ? 'debit' : 'credit',
      accountId: bank.accountId,
      pending: false,
      image: null,
    })
  );

  // Get Plaid transactions from DB
  let rawTransactions: any[];
  const dbRows = await prisma.plaidTransaction.findMany({
    where: { bankId: bank.id },
    orderBy: { date: 'desc' },
  });

  if (dbRows.length > 0) {
    rawTransactions = dbRows.map((t) => ({
      id: t.id,
      name: t.name,
      merchantName: t.merchantName,
      paymentChannel: t.paymentChannel,
      type: t.type,
      accountId: t.accountId,
      amount: parseFloat(t.amount.toString()),
      pending: t.pending,
      category: t.category,
      date: t.date,
      image: t.image,
    }));
    console.log(`[DB] Loaded ${rawTransactions.length} plaid txns for bank ${bank.id}`);
  } else if (!bank.lastSyncedAt && bank.accessToken && bank.source !== 'manual') {
    // First ever load — no DB data yet, must fetch from Plaid synchronously
    console.log(`[PLAID] First load for bank ${bank.id}, fetching from Plaid`);
    rawTransactions = await getTransactions(bank.accessToken, bank.id);
  } else {
    rawTransactions = [];
  }

  const transactions = categorizeTransactions(rawTransactions);

  // Merge, hash, and sort all transactions
  const allTransactions = [...transactions, ...transferTransactions]
    .map((t: any) => ({
      ...t,
      hash: hashTransaction(t.name || '', t.amount || 0, t.date || ''),
    }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const result = { data: account, transactions: allTransactions };

  // Trigger background Plaid sync if TTL expired
  triggerSyncIfNeeded(bank);

  // Evaluate spending alerts in the background
  if (userId) fireAlerts(userId, allTransactions);

  return result;
};

// ─── Background alert evaluation (extracted helper) ──────────

function fireAlerts(userId: string, allTransactions: any[]) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  prisma.user.findUnique({ where: { id: userId }, select: { email: true } }).then((user) => {
    if (user?.email) {
      evaluateAlerts(userId, user.email, allTransactions, currentMonth).catch((err) =>
        console.error('Alert evaluation error:', err)
      );
    }
  }).catch(() => {});
}

// ─── Cache invalidation (called after transfers & disconnects) ─

export async function clearAccountCache(bankRecordId: string, userId?: string) {
  // Delete Redis sync key so next request triggers a fresh Plaid sync
  await redisDel(`plaid-sync:${bankRecordId}`);

  // Clear all user-level analytics caches so pages reflect the change
  if (userId) {
    await Promise.all([
      redisDelByPrefix(`merchants:${userId}:`),
      redisDelByPrefix(`trends:${userId}:`),
      redisDelByPrefix(`recurring:${userId}`),
      redisDelByPrefix(`income-expense:${userId}:`),
      redisDelByPrefix(`budget-status:${userId}:`),
      redisDelByPrefix(`challenge-progress:${userId}`),
      redisDelByPrefix(`health:${userId}:`),
      redisDelByPrefix(`insights:${userId}:`),
      redisDelByPrefix(`chat-context:${userId}`),
      redisDelByPrefix(`fin-plan:${userId}:`),
      redisDelByPrefix(`health-score:${userId}`),
      redisDelByPrefix(`digest:${userId}`),
      redisDelByPrefix(`challenges:${userId}:`),
      redisDelByPrefix(`net-worth:${userId}`),
      redisDelByPrefix(`budget:${userId}:`),
    ]);
  }
}

// ─── getInstitution (cached in-memory, static data) ──────────

export const getInstitution = async (institutionId: string) => {
  const cached = getCached(institutionCache, institutionId);
  if (cached) return cached;

  const institutionResponse = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: ['US'] as CountryCode[],
  });

  const result = institutionResponse.data.institution;
  setCache(institutionCache, institutionId, result, INSTITUTION_TTL);
  return result;
};

// ─── getTransactions (persists to DB) ────────────────────────

export const getTransactions = async (accessToken: string, bankId: string) => {
  let hasMore = true;
  let transactions: any[] = [];

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
    });

    const data = response.data;

    transactions = response.data.added.map((transaction) => ({
      id: transaction.transaction_id,
      name: transaction.name,
      merchantName: transaction.merchant_name || transaction.name,
      paymentChannel: transaction.payment_channel,
      type: transaction.payment_channel,
      accountId: transaction.account_id,
      amount: transaction.amount,
      pending: transaction.pending,
      category: transaction.category ? transaction.category[0] : '',
      date: transaction.date,
      image: transaction.logo_url ?? null,
    }));

    hasMore = data.has_more;
  }

  // Persist to DB — insert new rows, skip duplicates
  if (transactions.length > 0) {
    await prisma.plaidTransaction.createMany({
      data: transactions.map((t) => ({
        id: t.id,
        bankId,
        name: t.name,
        merchantName: t.merchantName,
        paymentChannel: t.paymentChannel,
        type: t.type,
        accountId: t.accountId,
        amount: t.amount,
        pending: t.pending,
        category: t.category,
        date: t.date,
        image: t.image,
        syncedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    // Update any pending transactions that have now settled
    const settledIds = transactions.filter((t) => !t.pending).map((t) => t.id);
    if (settledIds.length > 0) {
      await prisma.plaidTransaction.updateMany({
        where: { id: { in: settledIds }, pending: true },
        data: { pending: false, syncedAt: new Date() },
      });
    }
  }

  return transactions;
};
