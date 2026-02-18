// src/pages/GameplayPage.tsx
// only Composition Root (Layout + Wiring)
// no "in-game UI"
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { apiGetGameStatus } from '@/api/game';
import { GameFooter } from '@/components';
import { DevtoolsHost } from '@/features/devtools-host';

const MIN_LEVEL = 1;
const MAX_LEVEL = 12;

function normalizeLevel(value: number): number {
  if (!Number.isFinite(value)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(value)));
}

function readLevelFromSearch(search: string): number {
  const raw = new URLSearchParams(search).get('level');
  const n = raw ? Number(raw) : NaN;

  return normalizeLevel(n);
}

export default function GameplayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const requestedLevel = useMemo(() => readLevelFromSearch(location.search), [location.search]);
  const [effectiveLevel, setEffectiveLevel] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;

    const applyGuard = async () => {
      // Guest mode: no backend stage guard available.
      if (!user?.id) {
        const guestLevel = MIN_LEVEL;
        setEffectiveLevel(guestLevel);

        if (requestedLevel !== guestLevel) {
          navigate(`/game-map/play-game?level=${guestLevel}`, { replace: true });
        }

        return;
      }

      try {
        const status = await apiGetGameStatus(user.id);
        const allowedStage = normalizeLevel(status?.allowedStage ?? MIN_LEVEL);

        if (disposed) return;

        setEffectiveLevel(allowedStage);

        if (requestedLevel !== allowedStage) {
          navigate(`/game-map/play-game?level=${allowedStage}`, { replace: true });
        }
      } catch {
        if (disposed) return;
        // Fallback to requested level if status is temporarily unavailable.
        setEffectiveLevel(requestedLevel);
      }
    };

    void applyGuard();

    return () => {
      disposed = true;
    };
  }, [navigate, requestedLevel, user?.id]);

  if (effectiveLevel === null) {
    return <div className="h-full w-full flex items-center justify-center text-cyan-100/70">Loading stage...</div>;
  }

  return (
    // Stage-inner layout: [gameplay area][footer], no extra document flow, no scrollbars.
    <div className="h-full w-full overflow-hidden grid grid-rows-[minmax(0,1fr)_auto] gap-0 p-6">
      <div className="min-h-0">
        <DevtoolsHost key={effectiveLevel} initialLevelId={effectiveLevel} />
      </div>

      <div className="shrink-0">
        <GameFooter />
      </div>
    </div>
  );
}
