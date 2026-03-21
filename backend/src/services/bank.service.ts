import { createHash } from 'crypto';
import { CountryCode } from 'plaid';
import { plaidClient } from '../lib/plaid.js';
import { getBanks as getBanksFromDb, getBank as getBankFromDb } from './user.service.js';
import { getTransactionsByBankId } from './transaction.service.js';
import { categorizeTransactions } from './gemini.service.js';
import { evaluateAlerts } from './alerts.service.js';
import { prisma } from '../lib/db.js';

// ─── In-Memory Caches ────────────────────────────────────────

type CacheEntry<T> = { data: T; expiresAt: number };

const accountCache = new Map<string, CacheEntry<any>>();
const ACCOUNT_TTL = 24 * 60 * 60 * 1000; // 24 hours

const accountsCache = new Map<string, CacheEntry<any>>();
const ACCOUNTS_TTL = 24 * 60 * 60 * 1000; // 24 hours

const institutionCache = new Map<string, CacheEntry<any>>();
const INSTITUTION_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    console.log(`[CACHE HIT] ${key}`);
    return entry.data;
  }
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── Transaction Hash (shared with gemini.service for note lookups) ───

export function hashTransaction(name: string, amount: number, date: string): string {
  return createHash('sha256').update(`${name}|${amount}|${date}`).digest('hex');
}

// ─── getAccounts (cached 5 min per userId) ───────────────────

export const getAccounts = async (userId: string) => {
  const cached = getCached(accountsCache, userId);
  if (cached) return cached;

  const banks = await getBanksFromDb(userId);

  const accounts = await Promise.all(
    banks.map(async (bank) => {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: bank.accessToken,
      });
      const accountData = accountsResponse.data.accounts[0];

      const institution = await getInstitution(
        accountsResponse.data.item.institution_id!
      );

      const account = {
        id: accountData.account_id,
        availableBalance: accountData.balances.available!,
        currentBalance: accountData.balances.current!,
        institutionId: institution.institution_id,
        name: accountData.name,
        officialName: accountData.official_name,
        mask: accountData.mask!,
        type: accountData.type as string,
        subtype: accountData.subtype! as string,
        bankRecordId: bank.id,
        shareableId: bank.shareableId,
      };

      return account;
    })
  );

  const totalBanks = accounts.length;
  const totalCurrentBalance = accounts.reduce((total, account) => {
    return total + account.currentBalance;
  }, 0);

  const result = { data: accounts, totalBanks, totalCurrentBalance };
  setCache(accountsCache, userId, result, ACCOUNTS_TTL);

  // Background: pre-warm full account cache for all banks so tab switches are instant
  for (const bank of banks) {
    if (!getCached(accountCache, bank.id)) {
      getAccount(bank.id, userId).catch((err) =>
        console.error(`Background pre-warm failed for bank ${bank.id}:`, err)
      );
    }
  }

  return result;
};

// ─── getAccount (cached 5 min per bankRecordId) ──────────────

export const getAccount = async (bankRecordId: string, userId?: string) => {
  const cached = getCached(accountCache, bankRecordId);
  if (cached) {
    // Still evaluate alerts in background even on cache hit
    if (userId) fireAlerts(userId, cached.transactions);
    return cached;
  }

  const bank = await getBankFromDb(bankRecordId);

  if (!bank) throw new Error('Bank not found');

  // Reuse accountsCache to skip a redundant Plaid call (it was just fetched by getAccounts())
  let accountData: any = null;
  if (userId) {
    const cachedAccounts = getCached(accountsCache, userId);
    if (cachedAccounts) {
      accountData = cachedAccounts.data.find((a: any) => a.bankRecordId === bankRecordId) ?? null;
    }
  }

  if (!accountData) {
    const accountsResponse = await plaidClient.accountsGet({ access_token: bank.accessToken });
    const raw = accountsResponse.data.accounts[0];
    const institution = await getInstitution(accountsResponse.data.item.institution_id!);
    accountData = {
      id: raw.account_id,
      availableBalance: raw.balances.available!,
      currentBalance: raw.balances.current!,
      institutionId: institution.institution_id,
      name: raw.name,
      officialName: raw.official_name,
      mask: raw.mask!,
      type: raw.type as string,
      subtype: raw.subtype! as string,
      bankRecordId: bank.id,
    };
  }

  const transferTransactionsData = await getTransactionsByBankId(bank.id);

  // Map internal transfers to Plaid-like shape for seamless UI merge
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

  // DB-first: serve persisted transactions, fall back to Plaid on first load
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
    // Background re-sync from Plaid if data is stale (>1 hour)
    const staleThreshold = 60 * 60 * 1000;
    if (dbRows[0]?.syncedAt && Date.now() - dbRows[0].syncedAt.getTime() > staleThreshold) {
      getTransactions(bank.accessToken, bank.id).catch((err) =>
        console.error('Background Plaid re-sync failed:', err)
      );
    }
  } else {
    console.log(`[PLAID] No cached txns for bank ${bank.id}, fetching from Plaid`);
    rawTransactions = await getTransactions(bank.accessToken, bank.id);
  }

  const transactions = categorizeTransactions(rawTransactions);

  const account = {
    id: accountData.id,
    availableBalance: accountData.availableBalance,
    currentBalance: accountData.currentBalance,
    institutionId: accountData.institutionId,
    name: accountData.name,
    officialName: accountData.officialName,
    mask: accountData.mask,
    type: accountData.type,
    subtype: accountData.subtype,
    bankRecordId: bank.id,
  };

  // Add hash to each transaction for note lookups
  const allTransactions = [...transactions, ...transferTransactions]
    .map((t: any) => ({
      ...t,
      hash: hashTransaction(t.name || '', t.amount || 0, t.date || ''),
    }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const result = { data: account, transactions: allTransactions };

  // Cache the result
  setCache(accountCache, bankRecordId, result, ACCOUNT_TTL);

  // Evaluate spending alerts in the background (non-blocking)
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

// ─── Cache invalidation (called after transfers) ────────────

export function clearAccountCache(bankRecordId: string, userId?: string) {
  accountCache.delete(bankRecordId);
  if (userId) accountsCache.delete(userId);
}

// ─── getInstitution (cached 24 hours) ────────────────────────

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

// ─── getTransactions (no separate cache — covered by getAccount cache) ─

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
