import CategoryBreakdownChart from '@/components/CategoryBreakdownChart';
import HeaderBox from '@/components/HeaderBox';
import SpendingInsightsCard from '@/components/SpendingInsightsCard';
import { serverApiRequest } from '@/lib/api/server-client';

const Insights = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;
  const account = await serverApiRequest<any>('/api/accounts/' + bankRecordId);

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="AI Insights"
          subtext="AI-powered analysis of your spending patterns and financial health."
        />

        {account?.transactions?.length > 0 && (
          <CategoryBreakdownChart transactions={account.transactions} />
        )}

        {bankRecordId && <SpendingInsightsCard bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default Insights;
