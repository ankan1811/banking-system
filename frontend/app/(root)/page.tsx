import CategoryBreakdownChart from '@/components/CategoryBreakdownChart';
import HeaderBox from '@/components/HeaderBox'
import RecentTransactions from '@/components/RecentTransactions';
import ResyncButton from '@/components/ResyncButton';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import RecurringTransactionsCard from '@/components/RecurringTransactionsCard';
import { serverApiRequest } from '@/lib/api/server-client';

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;

  // auth/me already called in layout — fetch only accounts
  const [loggedIn, accounts] = await Promise.all([
    serverApiRequest('/api/auth/me').catch(() => null),
    serverApiRequest('/api/accounts').catch(() => null),
  ]);

  const accountsData = accounts?.data ?? [];
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  const account = bankRecordId
    ? await serverApiRequest('/api/accounts/' + bankRecordId).catch(() => null)
    : null;

  return (
    <section className="home">
      <div className="home-content">
        <HeaderBox
          type="greeting"
          title="Welcome"
          user={loggedIn?.firstName || 'Guest'}
          subtext="Access and manage your account and transactions efficiently."
        />

        <div className="flex items-start justify-between gap-4">
          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
          {bankRecordId && <ResyncButton bankRecordId={bankRecordId} />}
        </div>

        {account?.transactions?.length > 0 && (
          <CategoryBreakdownChart transactions={account.transactions} />
        )}

        <RecurringTransactionsCard />

        <RecentTransactions
          accounts={accountsData}
          transactions={account?.transactions}
          bankRecordId={bankRecordId}
          page={currentPage}
        />
      </div>

      <RightSidebar
        user={loggedIn}
        transactions={account?.transactions}
        banks={accountsData}
      />
    </section>
  )
}

export default Home
