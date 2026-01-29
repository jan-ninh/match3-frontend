import { Navbar } from '@/components';
import { Outlet } from 'react-router-dom';

const GameLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};
export default GameLayout;
