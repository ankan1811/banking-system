import HeaderBox from '@/components/HeaderBox';
import ProfileSettings from '@/components/ProfileSettings';
import { serverApiRequest } from '@/lib/api/server-client';

const SettingsPage = async () => {
  const user = await serverApiRequest<any>('/api/auth/me');
  const accounts = await serverApiRequest<any>('/api/accounts');

  if (!user) return null;

  return (
    <section className="home">
      <div className="home-content max-w-2xl">
        <HeaderBox
          type="title"
          title="Settings"
          subtext="Manage your profile, connected banks, and account preferences."
        />
        <ProfileSettings user={user} accounts={accounts?.data || []} />
      </div>
    </section>
  );
};

export default SettingsPage;
