// src/app/layouts/MainLayout.tsx
import { Outlet } from 'react-router';
import stageBg from '@/assets/bg/match3-bg-04-techbay.png';

export default function MainLayout() {
  return (
    <div className="w-screen min-h-screen overflow-y-auto bg-neutral-900">
      <div className="min-h-screen grid grid-cols-[1fr_720px_1fr] items-start">
        {/* LEFT LANE  */}
        <div className="flex justify-center items-start">
          <div id="dev-left-lane" className="w-full flex justify-end px-6" style={{ paddingTop: 'var(--dev-panels-top, 0px)' }} />
        </div>

        {/* GAME VIEWPORT (720x960) */}
        <div
          id="app-stage"
          className="match3-viewport w-180 min-h-240 text-white relative overflow-hidden"
          style={{
            backgroundImage: `url(${stageBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* subtle dim for UI readability */}
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>

        {/* RIGHT LANE  */}
        <div className="flex justify-center items-start">
          <div id="dev-right-lane" className="w-full flex justify-start px-6" style={{ paddingTop: 'var(--dev-panels-top, 0px)' }} />
        </div>
      </div>
    </div>
  );
}
