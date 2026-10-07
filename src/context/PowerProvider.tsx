import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useGuest } from './GuestContext';
import { useAccountOutcome } from './OutcomeContext';
import { canonicalGuestPower } from '@/services/guest/guestStore';
import { accountPower } from '@/services/account/gameplayStore';
import { PowerContext } from './PowerContext';
import { POWER_CONSUME_EVENT, type PowerConsumeDetail } from './powerEvents';
import { isLaserRowMatch4TrainingStage } from '@/gamelogic/scenarios/policies';
import { getRuntimeLevelId } from './levelRuntime';

const DEV_POWERS_GRANT_MANY_EVENT = 'match3:powersGrantMany' as const;

type DevPowerBonus = {
  bomb: number;
  laser: number;
  extraShuffle: number;
};

type DevPowerGrantManyDetail = Readonly<{
  grants?: Partial<DevPowerBonus>;
}>;

const EMPTY_DEV_BONUS: DevPowerBonus = {
  bomb: 0,
  laser: 0,
  extraShuffle: 0,
};

function safeGrant(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function PowerProvider({ children }: { children: ReactNode }) {
  const { mode } = useAuth();
  const { save, store } = useGuest();
  const { store: account, gameplay } = useAccountOutcome();
  const [devBonus, setDevBonus] = useState<DevPowerBonus>(EMPTY_DEV_BONUS);

  // Dev-only inventory cheat used by the in-game debug panel.
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const onGrantMany = (e: Event) => {
      const grants = (e as CustomEvent<DevPowerGrantManyDetail>).detail?.grants;
      if (!grants) return;

      const bomb = safeGrant(grants.bomb);
      const laser = safeGrant(grants.laser);
      const extraShuffle = safeGrant(grants.extraShuffle);

      if (bomb === 0 && laser === 0 && extraShuffle === 0) return;

      setDevBonus((prev) => ({
        bomb: prev.bomb + bomb,
        laser: prev.laser + laser,
        extraShuffle: prev.extraShuffle + extraShuffle,
      }));
    };

    window.addEventListener(DEV_POWERS_GRANT_MANY_EVENT, onGrantMany);
    return () => window.removeEventListener(DEV_POWERS_GRANT_MANY_EVENT, onGrantMany);
  }, []);

  // Never carry a dev cheat inventory across auth-mode changes.
  useEffect(() => {
    setDevBonus(EMPTY_DEV_BONUS);
  }, [mode]);

  useEffect(() => {
    const onConsume = (e: Event) => {
      const d = (e as CustomEvent<PowerConsumeDetail>).detail;
      if (!d) return;

      if (mode === 'demo') {
        // Guest ownership/defaults/ACK semantics are unchanged.
        if (isLaserRowMatch4TrainingStage(getRuntimeLevelId())) return;

        const key = canonicalGuestPower(d.key);
        if (!key || !d.guestRunId || !d.guestAttemptId || !d.requestId) return;

        const baseCount = save.powers[key] ?? 0;

        if (baseCount > 0) {
          store.consume({ runId: d.guestRunId, attemptId: d.guestAttemptId }, key, d.amount, d.requestId);
          return;
        }

        // Authoritative inventory is empty: consume from the dev-only bonus instead.
        setDevBonus((prev) => {
          const current = prev[key];
          if (current <= 0) return prev;
          return { ...prev, [key]: Math.max(0, current - Math.max(1, d.amount | 0)) };
        });
        return;
      }

      if (!d.accountAttemptId || !d.requestId) return;

      const key = accountPower(String(d.key));
      if (!key) return;

      const baseCount = gameplay.powers[key] ?? 0;

      if (baseCount > 0) {
        account.consume(d.accountAttemptId, d.key, d.requestId);
        return;
      }

      // Account backend inventory stays authoritative. Dev bonus is intentionally local-only.
      setDevBonus((prev) => {
        const current = prev[key];
        if (current <= 0) return prev;
        return { ...prev, [key]: Math.max(0, current - 1) };
      });
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume);
  }, [mode, store, account, save.powers, gameplay.powers]);

  const value = useMemo(() => {
    const base = mode === 'demo' ? save.powers : gameplay.powers;

    // Guest + account stores are both canonicalized around "bomb".
    // Expose the legacy/current UI alias "gridlaser" from the same count.
    const bomb = (base.bomb ?? 0) + devBonus.bomb;
    const laser = (base.laser ?? 0) + devBonus.laser;
    const extraShuffle = (base.extraShuffle ?? 0) + devBonus.extraShuffle;

    return {
      powers: {
        ...base,
        bomb,
        gridlaser: bomb,
        laser,
        extraShuffle,
      },
      // Historical UI setters cannot grant authoritative inventory. Commands own account state.
      setPowers: () => {},
      setFromBackendAndSelect: () => {},
      selectedPowersForNextStage: null,
      setSelectedPowersForNextStage: () => {},
    };
  }, [mode, save.powers, gameplay.powers, devBonus]);

  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
}
