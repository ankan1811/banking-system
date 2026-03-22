import HeaderBox from '@/components/HeaderBox';
import GoalsManager from '@/components/GoalsManager';
import { serverApiRequest } from '@/lib/api/server-client';

const GoalsPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  const accountsData = accounts?.data ?? [];
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Savings Goals"
          subtext="Create and track your financial goals — from emergency funds to dream vacations."
        />
        <GoalsManager bankRecordId={bankRecordId} />
      </div>
    </section>
  );
};

export default GoalsPage;
