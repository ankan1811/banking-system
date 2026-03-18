import HeaderBox from '@/components/HeaderBox';
import IncomeExpenseChart from '@/components/IncomeExpenseChart';
import { serverApiRequest } from '@/lib/api/server-client';

const IncomeExpensePage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const bankRecordId = (id as string) || accounts?.data[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Income vs Expenses"
          subtext="Monthly breakdown of your income, spending, and net savings."
        />
        {bankRecordId && <IncomeExpenseChart bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default IncomeExpensePage;
