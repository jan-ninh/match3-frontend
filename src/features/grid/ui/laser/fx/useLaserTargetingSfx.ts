import { useCallback, useEffect, useRef } from 'react';
import { playSfx } from '@/features/audio';

type Options = Readonly<{
  armed: boolean;
  hoverRow: number | null;
  /**
   * Minimum time (ms) between targeting "tick" sounds.
   * - 0 => play on every row change (can spam/overlap)
   * - >0 => rate-limited; fast mouse movement still produces a controlled cadence
   */
  cooldownMs: number;
  /**
   * Optional delay (ms) before confirm sound fires (useful to sync with beam FX).
   */
  confirmDelayMs?: number;
}>;

type Api = Readonly<{
  playConfirm: () => void;
}>;

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

/**
 * UI-only Laser SFX orchestrator:
 * - targeting: plays when hoverRow changes while armed (rate-limited via cooldownMs)
 * - confirm: plays on user confirm click (optional delay)
 */
export function useLaserTargetingSfx({ armed, hoverRow, cooldownMs, confirmDelayMs = 0 }: Options): Api {
  const lastRowRef = useRef<number | null>(null);
  const lastPlayedAtRef = useRef<number>(-Infinity);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef(false);

  const armedRef = useRef(armed);
  const hoverRowRef = useRef(hoverRow);

  useEffect(() => {
    armedRef.current = armed;
    hoverRowRef.current = hoverRow;
  }, [armed, hoverRow]);

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

        // If we got disarmed while waiting, do nothing.
        if (!armedRef.current) {
          pendingRef.current = false;
          return;
        }

        if (!pendingRef.current) return;

        pendingRef.current = false;
        lastPlayedAtRef.current = nowMs();
        playSfx('laserTargeting');
      }, delayMs);
    },
    [],
  );

  // Targeting tick: play when row changes (rate-limited).
  useEffect(() => {
    if (!armed) {
      clearTimer();
      lastRowRef.current = null;
      lastPlayedAtRef.current = -Infinity;
      return;
    }

    if (hoverRow === null) return;

    const prev = lastRowRef.current;
    if (prev === hoverRow) return;

    lastRowRef.current = hoverRow;

    // Play on each row change, but optionally rate-limit.
    const cd = Math.max(0, cooldownMs);
    if (cd === 0) {
      playSfx('laserTargeting');
      lastPlayedAtRef.current = nowMs();
      return;
    }

    const now = nowMs();
    const elapsed = now - lastPlayedAtRef.current;

    if (elapsed >= cd) {
      clearTimer();
      playSfx('laserTargeting');
      lastPlayedAtRef.current = now;
      return;
    }

    // Too soon: schedule a single "tick" at the earliest allowed time.
    pendingRef.current = true;
    schedulePlay(cd - elapsed);
  }, [armed, hoverRow, cooldownMs, clearTimer, schedulePlay]);

  // Confirm SFX API.
  const playConfirm = useCallback(() => {
    if (typeof window === 'undefined') return;

    const delay = Math.max(0, confirmDelayMs);
    if (delay === 0) {
      playSfx('laserConfirm');
      return;
    }

    window.setTimeout(() => {
      playSfx('laserConfirm');
    }, delay);
  }, [confirmDelayMs]);

  // Cleanup.
  useEffect(() => clearTimer, [clearTimer]);

  return { playConfirm };
}
