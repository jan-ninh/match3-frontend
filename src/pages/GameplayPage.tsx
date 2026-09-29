// src/pages/GameplayPage.tsx
// only Composition Root (Layout + Wiring)
// no "in-game UI"
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useGuest } from '@/context/GuestContext';
import GuestStatus from '@/components/GuestStatus';
import { resolveGuestStage } from '@/services/guest/guestStore';
import { useAuth } from '@/context/AuthContext';
import { apiGetGameStatus } from '@/api/game';
import { GameFooter } from '@/components';
import { GameplayHost } from '@/features/gameplay';

const DevtoolsHost = lazy(() => import('@/features/devtools-host/ui/DevtoolsHost'));

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

function AccountGameplayPage() {
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

  return <StageView level={effectiveLevel} />;
}

type GuestBinding = { runId: string; attemptId: string; stageId: number };
function StageView({ level, guestBinding }: { level: number; guestBinding?: GuestBinding }) {
  return (
    <div className="h-full w-full overflow-hidden grid grid-rows-[minmax(0,1fr)_auto] gap-0 p-6">
      <div className="min-h-0">
        {import.meta.env.DEV ? (
          <Suspense fallback={<div>Loading devtools...</div>}>
            <DevtoolsHost initialLevelId={level} guestBinding={guestBinding} />
          </Suspense>
        ) : (
          <GameplayHost initialLevelId={level} guestBinding={guestBinding} />
        )}
      </div>
      <div className="shrink-0">
        <GuestStatus />
        <GameFooter />
      </div>
    </div>
  );
}

function GuestEntry({ requested }: { requested: number }) {
  const { save, store, entryId: activeEntry } = useGuest();
  const navigate = useNavigate();
  const [entryId] = useState(() => crypto.randomUUID());
  const [level] = useState(() => resolveGuestStage(store.getSnapshot().save, requested));
  useEffect(() => {
    if (requested !== level) {
      navigate('/game-map/play-game?level=' + level, { replace: true });
      return;
    }
    try {
      const entered = store.enter(level, entryId);
      if (!entered) return;
      return () => store.release(entered.lease);
    } catch {
      // A shared save may have advanced between route resolution and entry.
      navigate('/game-map/play-game?level=' + resolveGuestStage(store.getSnapshot().save, requested), { replace: true });
    }
  }, [store, entryId, level, requested, navigate]);
  const attempt = save.activeAttempt;
  if (activeEntry !== entryId || !attempt)
    return (
      <div>
        <GuestStatus />
        Starting local stage...
      </div>
    );
  return <StageView level={level} guestBinding={{ runId: save.runId, attemptId: attempt.attemptId, stageId: level }} />;
}

export default function GameplayPage() {
  const { user } = useAuth();
  const { save } = useGuest();
  const { search } = useLocation();
  const requested = readLevelFromSearch(search);
  return user ? <AccountGameplayPage key={user.id} /> : <GuestEntry key={save.runId + ':' + requested} requested={requested} />;
}
