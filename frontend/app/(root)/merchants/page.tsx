import HeaderBox from '@/components/HeaderBox';
import MerchantInsightsCard from '@/components/MerchantInsightsCard';

const MerchantsPage = () => {
  return (
    <section className="home">
      <div className="home-content">
        <HeaderBox
          type="title"
          title="Merchant Insights"
          subtext="See where you spend the most and discover your top merchants."
        />
        <MerchantInsightsCard />
      </div>
    </section>
  );
};

export default MerchantsPage;
