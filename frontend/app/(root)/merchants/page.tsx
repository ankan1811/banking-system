import HeaderBox from '@/components/HeaderBox';
import MerchantInsightsCard from '@/components/MerchantInsightsCard';
import { serverApiRequest } from '@/lib/api/server-client';

const MerchantsPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const accountsData = accounts?.data;
  const bankRecordId = (id as string) || accountsData[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Merchant Insights"
          subtext="See where you spend the most and discover your top merchants."
        />
        {bankRecordId && <MerchantInsightsCard bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default MerchantsPage;
