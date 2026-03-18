import HeaderBox from '@/components/HeaderBox';
import HealthScoreCard from '@/components/HealthScoreCard';
import { serverApiRequest } from '@/lib/api/server-client';

const HealthScorePage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const bankRecordId = (id as string) || accounts?.data[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Financial Health Score"
          subtext="AI-powered assessment of your financial health — updated hourly."
        />
        {bankRecordId && <HealthScoreCard bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default HealthScorePage;
