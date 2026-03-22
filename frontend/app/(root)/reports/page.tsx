import HeaderBox from '@/components/HeaderBox';
import MonthlyDigestView from '@/components/MonthlyDigestView';

const ReportsPage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Monthly Reports"
          subtext="AI-powered monthly digest of your financial health, budgets, goals, and spending."
        />
        <MonthlyDigestView />
      </div>
    </section>
  );
};

export default ReportsPage;
