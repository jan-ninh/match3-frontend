import { Outlet } from 'react-router';

export default function MainLayout() {
  return (
    <div className="w-screen min-h-screen flex justify-center items-start overflow-y-auto bg-neutral-900">
      <div className="w-[720px] min-h-[960px] bg-neutral-700 text-white">
        <Outlet />
      </div>
    </div>
  );
}
