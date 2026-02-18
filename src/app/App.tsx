import { Route, Routes } from 'react-router';
import MainLayout from '@/app/layouts/MainLayout';
import GameLayout from '@/app/layouts/GameLayout';
import { OverlayProvider } from '@/features/overlays';
import { AboutUs, GameStartPage, GameplayPage, LeaderboardPage, LevelMapPage, LoadingPage, ProfileDashboard, NotFoundPage } from '@/pages';

export default function App() {
  return (
    <OverlayProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<GameStartPage />} />
          <Route path="loading" element={<LoadingPage />} />
          <Route path="about-us" element={<AboutUs />} />

          <Route path="game-map" element={<GameLayout />}>
            <Route index element={<LevelMapPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="profile" element={<ProfileDashboard />} />
            <Route path="play-game" element={<GameplayPage />} />
          </Route>

          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </OverlayProvider>
  );
}
