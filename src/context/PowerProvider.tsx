import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useGuest } from './GuestContext';
import { useAccountOutcome } from './OutcomeContext';
import { canonicalGuestPower } from '@/services/guest/guestStore';
import { PowerContext } from './PowerContext';
import { POWER_CONSUME_EVENT, type PowerConsumeDetail } from './powerEvents';
import { isLaserRowMatch4TrainingStage } from '@/gamelogic/scenarios/policies';
import { getRuntimeLevelId } from './levelRuntime';
export function PowerProvider({ children }: { children: ReactNode }) {
  const { mode } = useAuth();
  const { save, store } = useGuest();
  const { store: account, gameplay } = useAccountOutcome();
  useEffect(() => {
    const onConsume = (e: Event) => {
      const d = (e as CustomEvent<PowerConsumeDetail>).detail;
      if (!d) return;
      if (mode === 'demo') {
        // Guest ownership/defaults/ACK semantics are unchanged.
        if (isLaserRowMatch4TrainingStage(getRuntimeLevelId())) return;
        const key = canonicalGuestPower(d.key);
        if (key && d.guestRunId && d.guestAttemptId && d.requestId)
          store.consume({ runId: d.guestRunId, attemptId: d.guestAttemptId }, key, d.amount, d.requestId);
      } else if (d.accountAttemptId && d.requestId) account.consume(d.accountAttemptId, d.key, d.requestId);
    };
    window.addEventListener(POWER_CONSUME_EVENT, onConsume);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume);
  }, [mode, store, account]);
  const value = useMemo(
    () => ({
      powers: mode === 'demo' ? save.powers : gameplay.powers,
      // Historical UI setters cannot grant authoritative inventory. Commands own account state.
      setPowers: () => {},
      setFromBackendAndSelect: () => {},
      selectedPowersForNextStage: null,
      setSelectedPowersForNextStage: () => {},
    }),
    [mode, save.powers, gameplay.powers],
  );
  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
}
