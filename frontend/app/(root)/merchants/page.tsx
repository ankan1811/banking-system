import HeaderBox from '@/components/HeaderBox';
import MerchantInsightsCard from '@/components/MerchantInsightsCard';
import { serverApiRequest } from '@/lib/api/server-client';

const MerchantsPage = async ({ searchParams: { id } }: SearchParamProps) => {
  const accounts = await serverApiRequest<any>('/api/accounts');
  if (!accounts) return null;

  const bankRecordId = (id as string) || accounts?.data[0]?.bankRecordId;

  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Merchant Insights"
          subtext="See where your money goes — top merchants ranked by spending."
        />
        {bankRecordId && <MerchantInsightsCard bankRecordId={bankRecordId} />}
      </div>
    </section>
  );
};

export default MerchantsPage;
