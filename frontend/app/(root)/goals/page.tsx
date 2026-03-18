import HeaderBox from '@/components/HeaderBox';
import GoalsManager from '@/components/GoalsManager';

const GoalsPage = async () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Savings Goals"
          subtext="Create and track your financial goals — from emergency funds to dream vacations."
        />
        <GoalsManager />
      </div>
    </section>
  );
};

export default GoalsPage;
