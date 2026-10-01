// src\features\grid\ui\fx\useTargetingTickSfx.ts
import { useCallback, useEffect, useRef } from 'react';
import { playSfx } from '@/features/audio';
import type { SfxId } from '@/features/audio/sfx/sfxManifest';

type TargetKey = string | number;

type Options = Readonly<{
  armed: boolean;
  targetKey: TargetKey | null;
  /**
   * Minimum time (ms) between tick sounds.
   * - 0 => play on every target change (can spam/overlap)
   * - >0 => rate-limited; fast hover still produces a controlled cadence
   */
  cooldownMs: number;
  sfxId: SfxId;
}>;

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

/**
 * UI-only helper: play a tick SFX whenever the targeting "key" changes while armed,
 * with an optional cooldown (rate-limit).
 */
export function useTargetingTickSfx({ armed, targetKey, cooldownMs, sfxId }: Options): void {
  const lastKeyRef = useRef<TargetKey | null>(null);
  const lastPlayedAtRef = useRef<number>(-Infinity);

  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef(false);

  const armedRef = useRef(armed);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  const clearTimer = useCallback(() => {
    if (typeof window === 'undefined') return;
    const t = timerRef.current;
    if (t !== null) window.clearTimeout(t);
    timerRef.current = null;
    pendingRef.current = false;
  }, []);

  const schedulePlay = useCallback(
    (delayMs: number) => {
      if (typeof window === 'undefined') return;
      if (timerRef.current !== null) return;

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;

        // Disarmed while waiting => do nothing.
        if (!armedRef.current) {
          pendingRef.current = false;
          return;
        }

        if (!pendingRef.current) return;

        pendingRef.current = false;
        lastPlayedAtRef.current = nowMs();
        playSfx(sfxId);
      }, delayMs);
    },
    [sfxId],
  );

  useEffect(() => {
    if (!armed) {
      clearTimer();
      lastKeyRef.current = null;
      lastPlayedAtRef.current = -Infinity;
      return;
    }

    if (targetKey === null) return;

    const prev = lastKeyRef.current;
    if (prev === targetKey) return;

    lastKeyRef.current = targetKey;

    const cd = Math.max(0, cooldownMs);
    if (cd === 0) {
      playSfx(sfxId);
      lastPlayedAtRef.current = nowMs();
      return;
    }

    const now = nowMs();
    const elapsed = now - lastPlayedAtRef.current;

    if (elapsed >= cd) {
      clearTimer();
      playSfx(sfxId);
      lastPlayedAtRef.current = now;
      return;
    }

    pendingRef.current = true;
    schedulePlay(cd - elapsed);
  }, [armed, targetKey, cooldownMs, sfxId, clearTimer, schedulePlay]);

  useEffect(() => clearTimer, [clearTimer]);
}
