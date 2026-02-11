// import { Avatar, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, CyberButton } from '@/components';
// import badges from '@/data/badges';
// import { useNavigate } from 'react-router';
// import { useAuth } from '@/context/AuthContext';
// import { useEffect, useMemo } from 'react';

// export default function ProfileDashboard() {
//   const navigate = useNavigate();
//   const { user, profile, refreshProfile } = useAuth();

//   useEffect(() => {
//     if (!user || profile) return;
//     refreshProfile().catch(() => {});
//   }, [user, profile, refreshProfile]);

//   const stats = useMemo(() => {
//     if (!profile) return [];
//     return [
//       { label: 'Wins', value: profile.gamesWon },
//       { label: 'Losses', value: profile.gamesLost },
//       { label: 'Games Played', value: profile.gamesPlayed },
//       { label: 'XP', value: profile.totalScore.toLocaleString() },
//     ];
//   }, [profile]);

//   const level = useMemo(() => {
//     if (!profile) return 1;
//     // Calculate level based on total score (1000 points per level)
//     return Math.floor(profile.totalScore / 1000) + 1;
//   }, [profile]);

//   const currentStage = useMemo(() => {
//     if (!profile) return null;
//     // Find the highest completed stage
//     return (
//       Object.entries(profile.progress)
//         .sort(([a], [b]) => {
//           const numA = parseInt(a.replace('stage', ''), 10);
//           const numB = parseInt(b.replace('stage', ''), 10);
//           return numB - numA;
//         })
//         .find(([, data]) => data.completed)?.[0] || null
//     );
//   }, [profile]);

//   const progressPercent = useMemo(() => {
//     if (!profile) return 0;
//     // Calculate progress percentage based on stage
//     // Assuming each stage requires 1000 points
//     const stageNum = currentStage ? parseInt(currentStage.replace('stage', ''), 10) : 1;
//     const expectedPoints = stageNum * 1000;
//     return Math.min((profile.totalScore / expectedPoints) * 100, 100);
//   }, [profile, currentStage]);

//   const achievedBadges = useMemo(() => {
//     if (!profile) return badges;

//     // Create a set of unlocked badge keys from profile for O(1) lookup
//     const unlockedKeys = new Set(profile.badges.map((b) => b.badgeKey));

//     // Map all badges from data, checking if each is unlocked
//     return badges.map((badge) => ({
//       id: badge.id,
//       label: badge.label,
//       icon: badge.icon,
//       unlocked: unlockedKeys.has(badge.id),
//     }));
//   }, [profile]);

//   if (!profile) {
//     return (
//       <>
//         <Navbar />
//         <div className="m-8 max-w-xl mx-auto flex flex-col space-y-4">
//           <p className="text-center text-gray-500">Loading profile...</p>
//         </div>
//       </>
//     );
//   }

//   return (
//     <>
//       <Navbar />
//       <div className="m-8 max-w-xl mx-auto  flex flex-col space-y-4">
//         <ProfileHeader username={profile.username} level={level}>
//           <Avatar size={124} />
//         </ProfileHeader>

//         <StatsGrid stats={stats} />

//         <ProgressBar percent={progressPercent} />

//         <BadgeGrid badges={achievedBadges} />
//       </div>
//       <div className="m-6 flex justify-center">
//         <CyberButton key={'Back'} label={'Back'} onClick={() => navigate('/game-map')} />
//       </div>
//     </>
//   );
// }

import { Avatar, BadgeGrid, ProfileHeader, ProgressBar, StatsGrid, Navbar, CyberButton, GlassSection } from '@/components';
import badges from '@/data/badges';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo } from 'react';

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user || profile) return;
    refreshProfile().catch(() => {});
  }, [user, profile, refreshProfile]);

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
    return Math.floor(profile.totalScore / 1000) + 1;
  }, [profile]);

  const currentStage = useMemo(() => {
    if (!profile) return null;
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
    const stageNum = currentStage ? parseInt(currentStage.replace('stage', ''), 10) : 1;
    const expectedPoints = stageNum * 1000;
    return Math.min((profile.totalScore / expectedPoints) * 100, 100);
  }, [profile, currentStage]);

  const achievedBadges = useMemo(() => {
    if (!profile) return badges;
    const unlockedKeys = new Set(profile.badges.map((b) => b.badgeKey));
    return badges.map((badge) => ({
      id: badge.id,
      label: badge.label,
      icon: badge.icon,
      unlocked: unlockedKeys.has(badge.id),
    }));
  }, [profile]);

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="m-8 max-w-xl mx-auto flex flex-col space-y-4">
          <p className="text-center text-cyan-100/40">Loading profile...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      {/* Dashboard shell with subtle cyber overlay */}
      <div className="m-8 max-w-xl mx-auto flex flex-col space-y-4">
        <ProfileHeader username={profile.username} level={level}>
          <Avatar size={124} />
        </ProfileHeader>

        <StatsGrid stats={stats} />
        <GlassSection>
          <ProgressBar percent={progressPercent} />
        </GlassSection>
        <GlassSection>
          <BadgeGrid badges={achievedBadges} />
        </GlassSection>
      </div>

      <div className="m-6 flex justify-center">
        {/* CyberButton unchanged */}
        <CyberButton key={'Back'} label={'Back'} onClick={() => navigate('/game-map')} />
      </div>
    </>
  );
}
