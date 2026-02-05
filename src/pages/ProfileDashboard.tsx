import { Avatar, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, Button } from '@/components';
import badges from '@/data/badges';
import { useNavigate } from 'react-router';

export default function ProfileDashboard() {
  const navigate = useNavigate();
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
      <div className="m-6 flex justify-center">
        <Button key={'Back'} label={'Back'} onClick={() => navigate('/game-map')} />
      </div>
    </>
  );
}
