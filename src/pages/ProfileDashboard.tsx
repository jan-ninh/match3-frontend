import { Avatar, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid } from '@/components';
import badges from '@/data/badges';

export default function ProfileDashboard() {
  return (
    <div className="m-4 mx-auto flex flex-col items-center space-y-4">
      <ProfileHeader username="Elsa" level={12}>
        <Avatar size={124} />
      </ProfileHeader>

      <StatsGrid
        stats={[
          { label: 'Wins', value: 24 },
          { label: 'Losses', value: 8 },
          { label: 'XP', value: '1,240' },
          { label: 'Rank', value: 'Gold' }
        ]}
      />

      <ProgressBar percent={65} />
      <BadgeGrid badges={badges} />
    </div>
  );
}