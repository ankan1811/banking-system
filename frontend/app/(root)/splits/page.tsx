import HeaderBox from '@/components/HeaderBox';
import SplitsManager from '@/components/SplitsManager';
import { serverApiRequest } from '@/lib/api/server-client';
import type { SplitGroup, SplitSummary } from '@shared/types';

const SplitsPage = async () => {
  const [splitsRes, summaryRes] = await Promise.all([
    serverApiRequest<{ splits: SplitGroup[] }>('/api/splits').catch(() => null),
    serverApiRequest<{ summary: SplitSummary }>('/api/splits/summary').catch(() => null),
  ]);

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Split Expenses"
          subtext="Split bills with friends and family — track who owes what."
        />
        <SplitsManager
          initialSplits={splitsRes?.splits ?? []}
          initialSummary={summaryRes?.summary ?? null}
        />
      </div>
    </section>
  );
};

export default SplitsPage;
