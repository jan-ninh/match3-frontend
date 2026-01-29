import { Route, Routes } from 'react-router-dom';
import { GameStartPage, AboutUs, LevelMapPage } from '@/pages';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<GameStartPage />} />
          <Route path="game-map" element={<LevelMapPage />} />
          <Route path="about-us" element={<AboutUs />} />
          <Route path="/" element={<GameStartPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
