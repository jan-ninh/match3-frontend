import { GameFooter } from '@/components';
import { DevtoolsHost } from '@/features/devtools-host';
import { useOverlays } from '@/features/overlays';

function readInitialLevelIdFromUrl(): number {
  if (typeof window === 'undefined') return 1;

  const raw = new URLSearchParams(window.location.search).get('level');
  const n = raw ? Number(raw) : NaN;

  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export default function GameplayPage() {
  const { openSettings } = useOverlays();

  const initialLevelId = readInitialLevelIdFromUrl();

  return (
    <div className="p-8 flex flex-col gap-8">
      {/* key erzwingt Remount, falls du innerhalb derselben Route den level-Query änderst */}
      <DevtoolsHost key={initialLevelId} initialLevelId={initialLevelId} />
      <GameFooter openSettings={openSettings} />
      {/* <button type="button" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80" onClick={() => openWin()}>
        test win
      </button>
      <button type="button" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80" onClick={() => openLose()}>
        test lose
      </button> */}
    </div>
  );
}
