// src/app/layouts/MainLayout.tsx
import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import stageBg from '@/assets/bg/match3-bg-04-techbay.png';

function isGameplayPath(pathname: string): boolean {
  // Route: /game-map/play-game (nested under MainLayout)
  return pathname.endsWith('/play-game');
}

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
  const location = useLocation();
  const isGameplay = isGameplayPath(location.pathname);

  // Keep viewport width stable across pages (prevents "jump" caused by scrollbar/100vw differences).
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const prev = html.style.getPropertyValue('scrollbar-gutter');

    html.style.setProperty('scrollbar-gutter', 'stable');

    return () => {
      if (prev) html.style.setProperty('scrollbar-gutter', prev);
      else html.style.removeProperty('scrollbar-gutter');
    };
  }, []);

  // Gameplay: guarantee no scrollbars even if a parent page left the document scrollable.
  // IMPORTANT: cleanup restores normal scrolling for non-game pages.
  // useLayoutEffect avoids a 1-frame layout jump on route change.
  useLayoutEffect(() => lockDocumentScroll(isGameplay), [isGameplay]);

  // Gameplay: viewport-locked, centered stage at DESIGN size (720×960 max), no document flow / no scrollbars.
  if (isGameplay) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-neutral-900">
        {/* DEV LANES (outside stage) */}
        <div className="absolute inset-0">
          {/* Dev lanes sit ABOVE the stage host, but only the actual panels are clickable (pointer-events). */}
          <div className="absolute inset-y-0 left-0 z-20 flex justify-end pointer-events-none">
            <div
              id="dev-left-lane"
              className="w-[min(520px,33vw)] max-w-full flex justify-end px-6 pointer-events-auto"
              style={{ paddingTop: 'var(--dev-panels-top, 0px)' }}
            />
          </div>

          <div className="absolute inset-y-0 right-0 z-20 flex justify-start pointer-events-none">
            <div
              id="dev-right-lane"
              className="w-[min(520px,33vw)] max-w-full flex justify-start px-6 pointer-events-auto"
              style={{ paddingTop: 'var(--dev-panels-top, 0px)' }}
            />
          </div>

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
              <div className="relative z-10 h-full min-h-0">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-game pages: keep the existing "720px center column + scroll" layout.
  // IMPORTANT: The stage itself is viewport-clamped -> Outlet must become the scroll container,
  // otherwise page content gets clipped at the bottom (leaderboard/profile back button).
  return (
    <div className="w-full min-h-screen overflow-y-auto bg-neutral-900">
      <div className="min-h-screen grid grid-cols-[1fr_720px_1fr] items-start">
        {/* LEFT LANE */}
        <div className="flex justify-center items-start">
          <div id="dev-left-lane" className="w-full flex justify-end px-6" style={{ paddingTop: 'var(--dev-panels-top, 0px)' }} />
        </div>

        {/* GAME VIEWPORT (720x960) */}
        <div
          id="app-stage"
          className="match3-viewport justify-self-center aspect-[3/4] h-[min(960px,100svh)] w-auto max-w-[100vw] text-white relative overflow-hidden"
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

        {/* RIGHT LANE */}
        <div className="flex justify-center items-start">
          <div id="dev-right-lane" className="w-full flex justify-start px-6" style={{ paddingTop: 'var(--dev-panels-top, 0px)' }} />
        </div>
      </div>
    </div>
  );
}
