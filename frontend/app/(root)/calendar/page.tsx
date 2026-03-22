import HeaderBox from '@/components/HeaderBox';
import BillCalendar from '@/components/BillCalendar';

const CalendarPage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Bill Calendar"
          subtext="Track upcoming bills and recurring payments on a monthly calendar."
        />
        <BillCalendar />
      </div>
    </section>
  );
};

export default CalendarPage;
