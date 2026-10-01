// src/app/layouts/MainLayout.tsx
import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import stageBg from '@/assets/bg/match3-bg-04-techbay.png';
import { GameBgFx } from '@/features/stage-bgfx/GameBgFx';

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

  const { pathname } = useLocation();

  //========================================================================================================
  // PERFORMANCE: MASTER TOGGLE (ALL STAGE BG VFX)
  // - true:  FX enabled on play-game route
  // - false: FX fully disabled (component not mounted)
  //========================================================================================================
  const BGFX_ENABLED = false;
  const showStageBgFx = BGFX_ENABLED && pathname === '/game-map/play-game';

  return (
    /* 0) MAINCONTAINER - 3 LANES  */
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* DEV LANES + STAGE (outside stage) */}
      <div className="absolute inset-0">
        {/* DEV LEFT LANE */}
        <div className="absolute inset-y-0 left-0 z-20 flex justify-end pointer-events-none"></div>
        {/* DEV RIGHT LANE */}
        <div className="absolute inset-y-0 right-0 z-20 flex justify-start pointer-events-none ">
          <div id="dev-right-lane" className="w-[min(520px,33vw)] max-w-full flex justify-start px-6 pointer-events-none" style={{ paddingTop: '20px' }} />
        </div>{' '}
        <div id="dev-left-lane" className="w-[min(520px,33vw)] max-w-full flex justify-end px-6 pointer-events-none" style={{ paddingTop: '20px' }} />
        {/* STAGE HOST */}
        <div className="absolute inset-0 z-10 flex items-center justify-center p-2 sm:p-4 overflow-hidden pointer-events-none ">
          <div
            id="app-stage"
            onContextMenuCapture={(e) => {
              e.preventDefault();
            }}
            className={[
              'match3-viewport relative overflow-hidden text-white pointer-events-auto',
              // Cap the stage at 720×960; fit the actual viewport without forcing a portrait ratio.
              'portfolio-stage',
            ].join(' ')}
            style={{
              backgroundImage: `url(${stageBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* BG FX must be stage-owned (not page-owned), otherwise padding/footer shrink it. */}
            {showStageBgFx ? <GameBgFx /> : null}

            {/* subtle dim for UI readability */}
            <div className="absolute inset-0 bg-black/15 pointer-events-none" />
            <div className="relative z-10 h-full min-h-0 overflow-y-auto ">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
