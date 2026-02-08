import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { GameFooter } from '@/components';
import { DevtoolsHost } from '@/features/devtools-host';
import { useOverlays } from '@/features/overlays';
import { getProgress } from '@/services/progress/progressActions';
import type { LevelId } from '@/services/progress/ProgressStore';

const TOTAL_LEVELS = 12;

function clampLevelId(n: number): LevelId {
  const x = Math.trunc(n);
  const clamped = Math.min(TOTAL_LEVELS, Math.max(1, x));
  return clamped as LevelId;
}

function parseLevelFromSearch(search: string): LevelId {
  const params = new URLSearchParams(search);
  const raw = params.get('level');
  const n = raw ? Number(raw) : 1;
  if (!Number.isFinite(n)) return 1 as LevelId;
  return clampLevelId(n);
}

export default function GameplayPage() {
  const { openSettings, openWin, openLose } = useOverlays();
  const location = useLocation();
  const navigate = useNavigate();

  const requestedLevel = useMemo(() => parseLevelFromSearch(location.search), [location.search]);
  const [allowedLevel, setAllowedLevel] = useState<LevelId | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const p = await getProgress();

      const unlocked = new Set(p.unlockedLevels);
      const completed = new Set(p.completedLevels);
      const isUnlocked = requestedLevel === 1 || unlocked.has(requestedLevel) || completed.has(requestedLevel - 1);

      if (!alive) return;

      if (!isUnlocked) {
        navigate('/game-map', { replace: true });
        return;
      }

      setAllowedLevel(requestedLevel);
    })();

    return () => {
      alive = false;
    };
  }, [requestedLevel, navigate]);

  if (allowedLevel === null) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 flex flex-col gap-8">
      <DevtoolsHost key={allowedLevel} initialLevelId={allowedLevel} onWin={(level) => openWin(level)} onLose={(level) => openLose(level)} />
      <GameFooter openSettings={openSettings} />
    </div>
  );
}
