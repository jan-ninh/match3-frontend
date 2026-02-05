import { Avatar, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar } from '@/components';
import badges from '@/data/badges';

export default function ProfileDashboard() {
  return (
    <>
      <Navbar />
      <div className="m-8 max-w-xl mx-auto  flex flex-col space-y-4">
        <ProfileHeader username="Elsa" level={12}>
          <Avatar size={124} />
        </ProfileHeader>

        <StatsGrid
          stats={[
            { label: 'Wins', value: 24 },
            { label: 'Losses', value: 8 },
            { label: 'XP', value: '1,240' },
            { label: 'Rank', value: 'Gold' },
          ]}
        />

        <ProgressBar percent={65} />
        <BadgeGrid badges={badges} />
      </div>
    </>
  );
}
