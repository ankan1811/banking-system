import HeaderBox from '@/components/HeaderBox';
import BudgetProgressCard from '@/components/BudgetProgressCard';

const BudgetsPage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Budget Tracker"
          subtext="Set monthly spending limits per category and track your progress in real time."
        />
        <BudgetProgressCard />
      </div>
    </section>
  );
};

export default BudgetsPage;
