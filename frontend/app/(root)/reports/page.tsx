import HeaderBox from '@/components/HeaderBox';
import MonthlyDigestView from '@/components/MonthlyDigestView';
import { serverApiRequest } from '@/lib/api/server-client';

const ReportsPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Monthly Reports"
          subtext="AI-powered monthly digest of your financial health, budgets, goals, and spending."
        />
        {bankRecordId && <MonthlyDigestView bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default ReportsPage;
