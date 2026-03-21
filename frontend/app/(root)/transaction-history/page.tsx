import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination';
import TransactionsTable from '@/components/TransactionsTable';
import ExportModal from '@/components/ExportModal';
import TransactionSearchView from '@/components/TransactionSearchView';
import { BankTabItem } from '@/components/BankTabItem';
import { serverApiRequest } from '@/lib/api/server-client';
import { formatAmount } from '@/lib/utils';
import React from 'react'

const TransactionHistory = async ({ searchParams: { id, page }}:SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const [loggedIn, accounts] = await Promise.all([
    serverApiRequest('/api/auth/me'),
    serverApiRequest('/api/accounts').catch(() => null),
  ]);

  const accountsData = accounts?.data ?? [];
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  const account = bankRecordId
    ? await serverApiRequest<any>(`/api/accounts/${bankRecordId}?page=${currentPage}&limit=10`).catch(() => null)
    : null;

  const currentTransactions = account?.transactions ?? [];
  const totalPages = account?.totalPages ?? 0;

  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        {accountsData.length > 1 && (
          <div className="recent-transactions-tablist">
            {accountsData.map((account: Account) => (
              <BankTabItem
                key={account.id}
                account={account}
                bankRecordId={bankRecordId}
              />
            ))}
          </div>
        )}

        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">{account?.data.name}</h2>
            <p className="text-14 text-slate-400">
              {account?.data.officialName}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {account?.data.mask}
            </p>
          </div>

          <div className='transactions-account-balance'>
            <p className="text-14 text-slate-400">Current balance</p>
            <p className="text-24 text-center font-bold text-white">{formatAmount(account?.data.currentBalance)}</p>
            {bankRecordId && (
              <ExportModal bankRecordId={bankRecordId} accountName={account?.data.name} />
            )}
          </div>
        </div>

        {bankRecordId && (
          <TransactionSearchView bankRecordId={bankRecordId} />
        )}

        <section className="flex w-full flex-col gap-6">
          <TransactionsTable
            transactions={currentTransactions}
          />
          {totalPages > 1 && (
            <div className="my-4 w-full">
              <Pagination totalPages={totalPages} page={currentPage} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistory
