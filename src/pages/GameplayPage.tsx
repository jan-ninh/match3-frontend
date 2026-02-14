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
    // Stage-inner layout: [gameplay area][footer], no extra document flow, no scrollbars.
    <div className="h-full w-full overflow-hidden grid grid-rows-[minmax(0,1fr)_auto] gap-6 p-6">
      <div className="min-h-0">
        <DevtoolsHost key={initialLevelId} initialLevelId={initialLevelId} />
      </div>

      <div className="shrink-0">
        <GameFooter openSettings={openSettings} />
      </div>
    </div>
  );
}
