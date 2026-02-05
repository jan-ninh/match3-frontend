import { Outlet } from 'react-router';

export default function MainLayout() {
  return (
    <div className="w-screen min-h-screen overflow-y-auto bg-neutral-900">
      <div className="min-h-screen grid grid-cols-[1fr_720px_1fr] items-start">
        {/* LEFT LANE  */}
        <div className="flex justify-center items-start">
          <div id="dev-left-lane" className="w-full flex justify-end px-6" style={{ paddingTop: 'var(--dev-panels-top, 0px)' }} />
        </div>

        {/* GAME VIEWPORT (720x960) */}
        <div id="app-stage" className="w-180 min-h-240 bg-neutral-700 text-white">
          <Outlet />
        </div>

        {/* RIGHT LANE  */}
        <div className="flex justify-center items-start">
          <div id="dev-right-lane" className="w-full flex justify-start px-6" style={{ paddingTop: 'var(--dev-panels-top, 0px)' }} />
        </div>
      </div>
    </div>
  );
}
