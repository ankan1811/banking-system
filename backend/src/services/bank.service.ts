import { CountryCode } from 'plaid';
import { plaidClient } from '../lib/plaid.js';
import { getBanks as getBanksFromDb, getBank as getBankFromDb } from './user.service.js';
import { getTransactionsByBankId } from './transaction.service.js';
import { categorizeTransactions } from './gemini.service.js';
import { evaluateAlerts } from './alerts.service.js';
import { prisma } from '../lib/db.js';

export const getAccounts = async (userId: string) => {
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

  return { data: accounts, totalBanks, totalCurrentBalance };
};

export const getAccount = async (bankRecordId: string, userId?: string) => {
  const bank = await getBankFromDb(bankRecordId);

  if (!bank) throw new Error('Bank not found');

  const accountsResponse = await plaidClient.accountsGet({
    access_token: bank.accessToken,
  });
  const accountData = accountsResponse.data.accounts[0];

  const transferTransactionsData = await getTransactionsByBankId(bank.id);

  const transferTransactions = transferTransactionsData.documents.map(
    (transferData: any) => ({
      id: transferData.id,
      name: transferData.name!,
      amount: typeof transferData.amount === 'object'
        ? parseFloat(transferData.amount.toString())
        : transferData.amount,
      date: transferData.createdAt,
      paymentChannel: transferData.channel,
      category: transferData.category,
      type: transferData.senderBankId === bank.id ? 'debit' : 'credit',
    })
  );

  const institution = await getInstitution(
    accountsResponse.data.item.institution_id!
  );

  const rawTransactions = await getTransactions(bank.accessToken);

  // Enrich with AI categories (uses DB cache, only calls Gemini for new txns)
  let transactions = rawTransactions;
  try {
    transactions = await categorizeTransactions(rawTransactions);
  } catch (err) {
    console.error('AI categorization failed, using original categories:', err);
  }

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
  };

  const allTransactions = [...transactions, ...transferTransactions].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Evaluate spending alerts in the background (non-blocking)
  if (userId) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }).then((user) => {
      if (user?.email) {
        evaluateAlerts(userId, user.email, allTransactions, currentMonth).catch((err) =>
          console.error('Alert evaluation error:', err)
        );
      }
    }).catch(() => {});
  }

  return {
    data: account,
    transactions: allTransactions,
  };
};

export const getInstitution = async (institutionId: string) => {
  const institutionResponse = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: ['US'] as CountryCode[],
  });

  return institutionResponse.data.institution;
};

export const getTransactions = async (accessToken: string) => {
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
      image: transaction.logo_url,
    }));

    hasMore = data.has_more;
  }

  return transactions;
};
