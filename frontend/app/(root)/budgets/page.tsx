import HeaderBox from '@/components/HeaderBox';
import BudgetProgressCard from '@/components/BudgetProgressCard';
import { serverApiRequest } from '@/lib/api/server-client';

const BudgetsPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Budget Tracker"
          subtext="Set monthly spending limits per category and track your progress in real time."
        />
        {bankRecordId && <BudgetProgressCard bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default BudgetsPage;
