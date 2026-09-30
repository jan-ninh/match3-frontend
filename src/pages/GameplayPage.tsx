import AccountAvailability from '@/components/AccountAvailability';
import AccountPersistenceStatus from '@/components/AccountPersistenceStatus';
import { useAccountOutcome } from '@/context/OutcomeContext';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useGuest } from '@/context/GuestContext';
import GuestStatus from '@/components/GuestStatus';
import { resolveGuestStage } from '@/services/guest/guestStore';
import { useAuth } from '@/context/AuthContext';
import { GameFooter } from '@/components';
import { GameplayHost } from '@/features/gameplay';
const DevtoolsHost = lazy(() => import('@/features/devtools-host/ui/DevtoolsHost'));
const MIN_LEVEL = 1,
  MAX_LEVEL = 12;
function normalizeLevel(value: number) {
  return Number.isFinite(value) ? Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(value))) : MIN_LEVEL;
}
function readLevelFromSearch(search: string) {
  const raw = new URLSearchParams(search).get('level');
  return normalizeLevel(raw ? Number(raw) : NaN);
}
function AccountEntry({ requested }: { requested: number }) {
  const { store, gameplay } = useAccountOutcome();
  const { canUseAccount } = useAuth();
  const navigate = useNavigate();
  const [entryId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    store.retain(entryId);
    void store.start(requested, entryId).catch(() => {});
    return () => store.release(entryId);
  }, [requested, entryId, store]);
  if (gameplay.binding && gameplay.liveEntryId === entryId) return <StageView level={gameplay.binding.stageNumber} />;
  return (
    <div>
      <AccountPersistenceStatus />
      {!canUseAccount && <AccountAvailability />}
      {gameplay.status === 'saving' && <p>Starting account stage...</p>}
      {gameplay.status === 'not-accepted' && <p>Stage start not accepted.</p>}
      <button type="button" className="underline" onClick={() => navigate('/game-map')}>
        Back to map
      </button>
    </div>
  );
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
        {!guestBinding && level === 12 && <p>Optional sandbox 12 · finalized campaign score stays unchanged.</p>}
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
  const { mode, generation } = useAuth();
  const { gameplay } = useAccountOutcome();
  const { save } = useGuest();
  const { search } = useLocation();
  const requested = readLevelFromSearch(search);
  if (mode === 'account')
    return gameplay.ownerId ? <AccountEntry key={gameplay.ownerId + ':' + generation + ':' + requested} requested={requested} /> : <AccountAvailability />;
  return <GuestEntry key={save.runId + ':' + requested} requested={requested} />;
}
