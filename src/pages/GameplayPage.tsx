import AccountAvailability from '@/components/AccountAvailability';
import { useRead } from '@/services/network/useRead';
import { RequestError } from '@/api/transport';
import ReadFailure from '@/components/ReadFailure';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { usePowers } from '@/context/PowerContext';
import { apiStartStage } from '@/api/game';
// src/pages/GameplayPage.tsx
// only Composition Root (Layout + Wiring)
// no "in-game UI"
import { Suspense, lazy, useEffect, useCallback, useState } from 'react';
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

function AccountGameplayPage({ ownerId }: { ownerId: string }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const requested = readLevelFromSearch(search);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data = await apiGetGameStatus(ownerId, signal);
      if (!Number.isInteger(data.allowedStage) || data.allowedStage! < 1 || data.allowedStage! > 12) throw new RequestError('protocol');
      return data;
    },
    [ownerId],
  );
  const read = useRead(ownerId, load);
  const level = read.data?.allowedStage;
  useEffect(() => {
    if (read.status === 'success' && level !== requested) navigate('/game-map/play-game?level=' + level, { replace: true });
  }, [read.status, level, requested, navigate]);
  if (read.status === 'error') return <ReadFailure error={read.error} retry={read.retry} />;
  if (read.status !== 'success' || level !== requested)
    return (
      <div>
        Loading stage...{' '}
        <button type="button" onClick={() => navigate('/game-map')}>
          Back to map
        </button>
      </div>
    );
  return <AccountStageEntry key={ownerId + ':' + level} ownerId={ownerId} level={level!} />;
}
function AccountStageEntry({ level, ownerId }: { level: number; ownerId: string }) {
  const { generation, isCurrent } = useAuth();
  const { store, outcome } = useAccountOutcome();
  const { setPowers, setSelectedPowersForNextStage } = usePowers();
  const [allowed] = useState(() => !store.blocked(ownerId));
  const [id] = useState(() => crypto.randomUUID());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let obsolete = false;
    void Promise.resolve().then(() => {
      if (obsolete || !allowed) return;
      store.start({
        ownerId,
        generation,
        id,
        stage: level,
        write: () => apiStartStage(ownerId, level),
        present: () => {},
        confirmed: () => {
          if (obsolete || !isCurrent(generation, ownerId)) return;
          const value = store.getSnapshot()?.result as { boosters?: import('@/types').Powers } | undefined;
          if (value?.boosters) setPowers(value.boosters);
          setSelectedPowersForNextStage(null);
          setReady(true);
        },
      });
    });
    return () => {
      obsolete = true;
    };
  }, [allowed, ownerId, id, level, store, setPowers, setSelectedPowersForNextStage, generation, isCurrent]);
  if (!allowed) return <ReadFailure title="Account save unresolved. Use Demo or check your account later." />;
  if (ready) return <StageView level={level} />;
  if (outcome?.id !== id || outcome.status === 'saving')
    return (
      <div>
        Preparing account stage... <ReadFailure title="Account preparation" />
      </div>
    );
  if (outcome.status !== 'saved')
    return <ReadFailure title={outcome.status === 'unconfirmed' ? 'Account stage start unconfirmed' : 'Account stage start not accepted'} />;
  return <StageView level={level} />;
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
  const { user, mode, canUseAccount, generation } = useAuth();
  const { save } = useGuest();
  const { search } = useLocation();
  const [entry, setEntry] = useState(() => (canUseAccount && user ? { id: user.id, generation } : null));
  useEffect(() => {
    if (mode === 'account' && canUseAccount && user) void Promise.resolve().then(() => setEntry({ id: user.id, generation }));
  }, [mode, canUseAccount, user, generation]);
  const requested = readLevelFromSearch(search);
  if (mode === 'account' && (!entry || entry.generation !== generation)) return <AccountAvailability />;
  return mode === 'account' && entry ? (
    <AccountGameplayPage key={entry.id + ':' + generation} ownerId={entry.id} />
  ) : (
    <GuestEntry key={save.runId + ':' + requested} requested={requested} />
  );
}
