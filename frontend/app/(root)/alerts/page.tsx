import HeaderBox from '@/components/HeaderBox';
import AlertsManager from '@/components/AlertsManager';

const AlertsPage = async () => {
  return (
    <section className="home">
      <div className="home-content max-w-3xl">
        <HeaderBox
          type="title"
          title="Spending Alerts"
          subtext="Get email notifications when your spending crosses a limit you set."
        />
        <AlertsManager />
      </div>
    </section>
  );
};

export default AlertsPage;
