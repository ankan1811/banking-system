import HeaderBox from '@/components/HeaderBox';
import AlertsManager from '@/components/AlertsManager';

const AlertsPage = async () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Alerts"
          subtext="Set up custom alerts for spending thresholds, low balances, and more."
        />
        <AlertsManager />
      </div>
    </section>
  );
};

export default AlertsPage;
