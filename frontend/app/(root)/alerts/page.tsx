import HeaderBox from '@/components/HeaderBox';
import AlertsManager from '@/components/AlertsManager';

const AlertsPage = async () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Spending Alerts"
          subtext="Get email notifications when your spending reaches set thresholds."
        />
        <AlertsManager />
      </div>
    </section>
  );
};

export default AlertsPage;
