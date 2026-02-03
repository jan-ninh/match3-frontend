import { Outlet } from 'react-router';
import { Navbar } from '@/components';

export default function GameLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
