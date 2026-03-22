import HeaderBox from '@/components/HeaderBox';
import HealthScoreCard from '@/components/HealthScoreCard';

const HealthScorePage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Financial Health Score"
          subtext="See how healthy your finances are based on spending, savings, and debt ratios."
        />
        <HealthScoreCard />
      </div>
    </section>
  );
};

export default HealthScorePage;
