import HeaderBox from '@/components/HeaderBox';
import BillCalendar from '@/components/BillCalendar';
import { serverApiRequest } from '@/lib/api/server-client';

const CalendarPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Bill Calendar"
          subtext="See when your recurring charges and subscriptions are due each month."
        />
        {bankRecordId && <BillCalendar bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default CalendarPage;
