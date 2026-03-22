import HeaderBox from '@/components/HeaderBox';
import SpendingTrendsChart from '@/components/SpendingTrendsChart';

const TrendsPage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Spending Trends"
          subtext="Visualize how your spending changes over time across categories."
        />
        <SpendingTrendsChart />
      </div>
    </section>
  );
};

export default TrendsPage;
