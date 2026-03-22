import HeaderBox from '@/components/HeaderBox';
import IncomeExpenseChart from '@/components/IncomeExpenseChart';

const IncomeExpensePage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Income vs Expense"
          subtext="Compare your monthly income and expenses side by side."
        />
        <IncomeExpenseChart />
      </div>
    </section>
  );
};

export default IncomeExpensePage;
