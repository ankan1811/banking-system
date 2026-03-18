import HeaderBox from '@/components/HeaderBox';
import SplitsManager from '@/components/SplitsManager';

const SplitsPage = async () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Split Expenses"
          subtext="Split bills with friends and family — track who owes what."
        />
        <SplitsManager />
      </div>
    </section>
  );
};

export default SplitsPage;
