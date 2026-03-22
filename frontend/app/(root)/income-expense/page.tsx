import HeaderBox from '@/components/HeaderBox';
import IncomeExpenseChart from '@/components/IncomeExpenseChart';
import { serverApiRequest } from '@/lib/api/server-client';

const IncomeExpensePage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Income vs Expense"
          subtext="Compare your monthly income and expenses side by side."
        />
        {bankRecordId && <IncomeExpenseChart bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default IncomeExpensePage;
