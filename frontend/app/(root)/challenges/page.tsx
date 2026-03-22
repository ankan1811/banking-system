import HeaderBox from '@/components/HeaderBox';
import ChallengesManager from '@/components/ChallengesManager';

const ChallengesPage = () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Spending Challenges"
          subtext="Take on challenges to build better spending habits and earn badges."
        />
        <ChallengesManager />
      </div>
    </section>
  );
};

export default ChallengesPage;
