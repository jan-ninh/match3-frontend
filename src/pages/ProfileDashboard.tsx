import { Avatar, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, Button } from '@/components';
import badges from '@/data/badges';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const stats = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Wins', value: profile.gamesWon },
      { label: 'Losses', value: profile.gamesLost },
      { label: 'Games Played', value: profile.gamesPlayed },
      { label: 'XP', value: profile.totalScore.toLocaleString() },
    ];
  }, [profile]);

  const level = useMemo(() => {
    if (!profile) return 1;
    // Calculate level based on total score (1000 points per level)
    return Math.floor(profile.totalScore / 1000) + 1;
  }, [profile]);

  const currentStage = useMemo(() => {
    if (!profile) return null;
    // Find the highest completed stage
    return (
      Object.entries(profile.progress)
        .sort(([a], [b]) => {
          const numA = parseInt(a.replace('stage', ''), 10);
          const numB = parseInt(b.replace('stage', ''), 10);
          return numB - numA;
        })
        .find(([, data]) => data.completed)?.[0] || null
    );
  }, [profile]);

  const progressPercent = useMemo(() => {
    if (!profile) return 0;
    // Calculate progress percentage based on stage
    // Assuming each stage requires 1000 points
    const stageNum = currentStage ? parseInt(currentStage.replace('stage', ''), 10) : 1;
    const expectedPoints = stageNum * 1000;
    return Math.min((profile.totalScore / expectedPoints) * 100, 100);
  }, [profile, currentStage]);

  const achievedBadges = useMemo(() => {
    if (!profile) return [];
    // Map profile badges to badge data
    return profile.badges.map((badge) => {
      const badgeData = badges.find((b) => b.id === badge.badgeKey);
      return {
        id: badgeData?.id || badge.badgeKey,
        label: badgeData?.label || 'Unknown Badge',
        icon: badgeData?.icon || '🏆',
        unlocked: true,
      };
    });
  }, [profile]);

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="m-8 max-w-xl mx-auto flex flex-col space-y-4">
          <p className="text-center text-gray-500">Loading profile...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="m-8 max-w-xl mx-auto  flex flex-col space-y-4">
        <ProfileHeader username={profile.username} level={level}>
          <Avatar size={124} />
        </ProfileHeader>

        <StatsGrid stats={stats} />

        <ProgressBar percent={progressPercent} />

        <BadgeGrid badges={achievedBadges} />
      </div>
      <div className="m-6 flex justify-center">
        <Button key={'Back'} label={'Back'} onClick={() => navigate('/game-map')} />
      </div>
    </>
  );
}
