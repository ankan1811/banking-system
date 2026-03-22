import HeaderBox from '@/components/HeaderBox';
import ChallengesManager from '@/components/ChallengesManager';
import { serverApiRequest } from '@/lib/api/server-client';

const ChallengesPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Spending Challenges"
          subtext="Take on challenges to build better spending habits and earn badges."
        />
        {bankRecordId && <ChallengesManager bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default ChallengesPage;
