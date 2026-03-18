import HeaderBox from '@/components/HeaderBox';
import SpendingTrendsChart from '@/components/SpendingTrendsChart';
import { serverApiRequest } from '@/lib/api/server-client';

const TrendsPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Spending Trends"
          subtext="See how your spending has changed across categories over the past months."
        />
        {bankRecordId && <SpendingTrendsChart bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default TrendsPage;
