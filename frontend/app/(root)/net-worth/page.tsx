import HeaderBox from '@/components/HeaderBox';
import NetWorthManager from '@/components/NetWorthManager';

const NetWorthPage = async () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Net Worth"
          subtext="Track your total assets and liabilities — see your full financial picture."
        />
        <NetWorthManager />
      </div>
    </section>
  );
};

export default NetWorthPage;
