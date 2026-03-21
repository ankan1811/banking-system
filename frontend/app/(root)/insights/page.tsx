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
      <div className="home-content">
        <HeaderBox
          type="title"
          title="AI Insights"
          subtext="AI-powered analysis of your spending patterns and financial health."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {account?.transactions?.length > 0 && (
            <div className="lg:col-span-1">
              <CategoryBreakdownChart transactions={account.transactions} />
            </div>
          )}

          {bankRecordId && (
            <div className="lg:col-span-1">
              <SpendingInsightsCard bankRecordId={bankRecordId} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Insights;
