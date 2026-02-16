// src/app/layouts/MainLayout.tsx
import { useLayoutEffect } from 'react';
import { Outlet } from 'react-router';
import stageBg from '@/assets/bg/match3-bg-04-techbay.png';

function lockDocumentScroll(enabled: boolean): () => void {
  if (!enabled) return () => {};
  if (typeof document === 'undefined') return () => {};

  const html = document.documentElement;
  const body = document.body;

  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    htmlHeight: html.style.height,
    bodyHeight: body.style.height,
  };

  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  html.style.height = '100%';
  body.style.height = '100%';

  return () => {
    html.style.overflow = prev.htmlOverflow;
    body.style.overflow = prev.bodyOverflow;
    html.style.height = prev.htmlHeight;
    body.style.height = prev.bodyHeight;
  };
}

export default function MainLayout() {
  // Always lock document scrolling.
  // All pages scroll (if needed) inside the stage viewport to avoid scrollbar/width jumps.
  useLayoutEffect(() => lockDocumentScroll(true), []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-neutral-900">
      {/* DEV LANES + STAGE (outside stage) */}
      <div className="absolute inset-0">
        {/* DEV LEFT LANE */}
        <div className="absolute inset-y-0 left-0 z-20 flex justify-end pointer-events-none"></div>
        {/* DEV RIGHT LANE */}
        <div className="absolute inset-y-0 right-0 z-20 flex justify-start pointer-events-none">
          <div id="dev-right-lane" className="w-[min(520px,33vw)] max-w-full flex justify-start px-6 pointer-events-auto" style={{ paddingTop: '10px' }} />
        </div>{' '}
        <div id="dev-left-lane" className="w-[min(520px,33vw)] max-w-full flex justify-end px-6 pointer-events-auto" style={{ paddingTop: '10px' }} />
        {/* STAGE HOST */}
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 overflow-hidden pointer-events-none">
          <div
            id="app-stage"
            className={[
              'match3-viewport relative overflow-hidden text-white pointer-events-auto',
              'aspect-[3/4]',
              // Design policy: keep the stage at 720×960 (or smaller if viewport is smaller).
              'h-[min(960px,100svh)] w-auto max-w-[min(720px,calc(100vw-2rem))]',
            ].join(' ')}
            style={{
              backgroundImage: `url(${stageBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* subtle dim for UI readability */}
            <div className="absolute inset-0 bg-black/15 pointer-events-none" />
            <div className="relative z-10 h-full min-h-0 overflow-y-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
