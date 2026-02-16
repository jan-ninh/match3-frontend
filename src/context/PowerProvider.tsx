// src/context/PowerProvider.tsx
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PowerKey, Powers } from '@/types';

import { PowerContext, defaultPowers } from './PowerContext';
import { POWER_CONSUME_EVENT, POWER_GRANT_EVENT, type PowerConsumeDetail, type PowerGrantDetail } from './powerEvents';

const POWERS_GRANT_MANY_EVENT = 'match3:powersGrantMany' as const;

type PowerGrantManyDetail = Readonly<{
  grants: Partial<Record<PowerKey, number>>;
}>;

const POWER_KEYS = Object.keys(defaultPowers) as PowerKey[];
const POWER_KEY_SET = new Set<string>(POWER_KEYS);

function isPowerKey(key: string): key is PowerKey {
  return POWER_KEY_SET.has(key);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isPowerGrantManyDetail(v: unknown): v is PowerGrantManyDetail {
  if (!isRecord(v)) return false;
  const grants = v.grants;
  return isRecord(grants);
}

export function PowerProvider({ children }: { children: ReactNode }) {
  // IMPORTANT: clone to avoid sharing the frozen object reference as state
  const [powers, setPowersState] = useState<Powers>(() => ({ ...defaultPowers }));
  const [selectedPowersForNextStage, setSelectedPowersForNextStageState] = useState<Partial<Powers> | null>(null);

  // UI grants (dev cheats, backend rewards, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onGrant = (e: Event) => {
      const ce = e as CustomEvent<PowerGrantDetail>;
      const d = ce.detail;
      if (!d) return;

      const key = d.key;
      if (!isPowerKey(key)) return;

      const delta = d.delta | 0;
      if (delta === 0) return;

      setPowersState((prev) => {
        const cur = (prev[key] ?? 0) | 0;
        const nextVal = Math.max(0, cur + delta);
        if (nextVal === cur) return prev;
        return { ...prev, [key]: nextVal };
      });
    };

    window.addEventListener(POWER_GRANT_EVENT, onGrant as EventListener);
    return () => window.removeEventListener(POWER_GRANT_EVENT, onGrant as EventListener);
  }, []);

  // Multi-grant (dev cheats). Bypasses any single-grant side-effects elsewhere.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onGrantMany = (e: Event) => {
      const ce = e as CustomEvent<unknown>;
      const d = ce.detail;
      if (!isPowerGrantManyDetail(d)) return;

      setPowersState((prev) => {
        let changed = false;
        const updates: Partial<Powers> = {};

        for (const [rawKey, rawDelta] of Object.entries(d.grants)) {
          if (!isPowerKey(rawKey)) continue;

          const delta = (typeof rawDelta === 'number' ? rawDelta : 0) | 0;
          if (delta === 0) continue;

          const cur = (prev[rawKey] ?? 0) | 0;
          const nextVal = Math.max(0, cur + delta);
          if (nextVal === cur) continue;

          updates[rawKey] = nextVal;
          changed = true;
        }

        if (!changed) return prev;
        return { ...prev, ...updates };
      });
    };

    window.addEventListener(POWERS_GRANT_MANY_EVENT, onGrantMany as EventListener);
    return () => window.removeEventListener(POWERS_GRANT_MANY_EVENT, onGrantMany as EventListener);
  }, []);

  // Engine-ack-driven consume: dispatch only after EngineEvent `powerUsed` was observed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume = (e: Event) => {
      const ce = e as CustomEvent<PowerConsumeDetail>;
      const d = ce.detail;
      if (!d) return;

      const key = d.key;
      if (!isPowerKey(key)) return;

      const amount = d.amount | 0;
      if (amount <= 0) return;

      setPowersState((prev) => {
        const cur = (prev[key] ?? 0) | 0;
        const nextVal = Math.max(0, cur - amount);
        if (nextVal === cur) return prev;
        return { ...prev, [key]: nextVal };
      });
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
  }, []);

  const setPowers = (next: Powers) => {
    setPowersState(next);
  };

  // NOTE:
  // This may be called AFTER the UI already granted the bonus (e.g. Modal adds +2 immediately).
  // To prevent double-counting, we keep the higher of:
  // - prev[selected] (current UI state)
  // - backend[selected] + bonus (expected post-choice value if backend is "base")
  const setFromBackendAndSelect = (backendPowers: Powers, selected: PowerKey) => {
    setPowersState((prev) => {
      const next: Powers = {
        bomb: backendPowers.bomb ?? 0,
        laser: backendPowers.laser ?? 0,
        extraShuffle: backendPowers.extraShuffle ?? 0,
      };

      const prevCount = (prev[selected] ?? 0) | 0;
      const candidate = (next[selected] ?? 0) | 0;

      next[selected] = Math.max(prevCount, candidate);

      return next;
    });
  };

  const value = useMemo(
    () => ({ powers, setFromBackendAndSelect, setPowers, selectedPowersForNextStage, setSelectedPowersForNextStage: setSelectedPowersForNextStageState }),
    [powers, selectedPowersForNextStage],
  );

  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
}
