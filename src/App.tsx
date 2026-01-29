import { Route, Routes } from 'react-router-dom';
import { GameStartPage, AboutUs, LevelMapPage, LeaderboardPage, ProfilePage, GameplayPage } from '@/pages';
import MainLayout from './layouts/MainLayout';
import GameLayout from './layouts/GameLayout';
import { OverlayProvider } from '@/overlays';

function App() {
  return (
    <OverlayProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<GameStartPage />} />
          <Route path="about-us" element={<AboutUs />} />
          <Route path="game-map/play-game" element={<GameplayPage />} />

          <Route path="game-map" element={<GameLayout />}>
            <Route index element={<LevelMapPage />} />
            <Route path="setting" element={<LevelMapPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="login" element={<LevelMapPage />} />
            <Route path="logout" element={<LevelMapPage />} />
          </Route>
        </Route>
      </Routes>
    </OverlayProvider>
  );
}

export default App;
