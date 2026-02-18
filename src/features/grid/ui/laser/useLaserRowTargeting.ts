// src/features/grid/ui/laser/useLaserRowTargeting.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import { POWER_ARM_EVENT, POWER_USE_AT_EVENT, type PowerUseAtDetail } from '@/context/powerEvents';
import { playSfx } from '@/features/audio/sfx/sfxPlayer';

import { LASER_ENGINE_DELAY_MS } from './laserTimings';

type Opts = Readonly<{
  width: number;
  height: number;
  inputLocked: boolean;
  /** Optional board element rect to avoid padding/border skew from shell wrapper. */
  boardRef?: RefObject<HTMLElement | null>;
}>;

type ArmDetailLike = Readonly<{
  key: string;
  armed: boolean;
}>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isArmDetailLike(v: unknown): v is ArmDetailLike {
  if (!isRecord(v)) return false;
  return typeof v.key === 'string' && typeof v.armed === 'boolean';
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n | 0;
}

declare global {
  interface Window {
    __match3PowerRequestId?: number;
  }
}

function allocPowerRequestId(): number {
  if (typeof window === 'undefined') return 1;
  const cur = (window.__match3PowerRequestId ?? 1) | 0;
  const next = (cur + 1) | 0;
  window.__match3PowerRequestId = next <= 0 ? 1 : next;
  return cur <= 0 ? 1 : cur;
}

// IMPORTANT:
// - `laser` is the ROW-CLEAR power.
// - `gridlaser` is the OLD BOMB (3x3) refactor and must NOT be handled here.
const LASER_KEYS = new Set<string>(['laser', 'laserRow', 'laserRowClear']);

function normalizeLaserKeyForEngine(key: string): 'laser' | null {
  return LASER_KEYS.has(key) ? 'laser' : null;
}

type PendingUse = Readonly<{
  detail: PowerUseAtDetail;
  confirmRow: number;
}>;

export function useLaserRowTargeting({ width, height, inputLocked, boardRef }: Opts) {
  const [laserArmed, setLaserArmed] = useState(false);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const laserArmedRef = useRef(false);
  useEffect(() => {
    laserArmedRef.current = laserArmed;
  }, [laserArmed]);

  // Remember which key variant armed us, so we can disarm the exact same key.
  const armedKeyRef = useRef<string>('laser');

  const emitArm = useCallback((armed: boolean) => {
    if (typeof window === 'undefined') return;
    const key = armedKeyRef.current;
    window.dispatchEvent(new CustomEvent(POWER_ARM_EVENT, { detail: { key, armed } }));
  }, []);

  // Pending confirm (engine dispatch is delayed, SFX is immediate).
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const pendingRef = useRef<PendingUse | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    setPendingConfirm(false);

    if (typeof window === 'undefined') {
      timerRef.current = null;
      return;
    }

    const id = timerRef.current;
    timerRef.current = null;
    if (id != null) window.clearTimeout(id);
  }, []);

  // Cleanup on unmount.
  useEffect(() => clearPending, [clearPending]);

  // Global arm/disarm sync (Footer emits this).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<unknown>;
      const d = ce.detail;

      if (!isArmDetailLike(d)) return;
      if (!LASER_KEYS.has(d.key)) return;

      armedKeyRef.current = d.key;

      const armed = !!d.armed;
      setLaserArmed(armed);

      if (!armed) {
        clearPending();
        setHoverRow(null);
      }
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, [clearPending]);

  // Safety: input lock => disarm (prevents stuck targeting).
  // This also cancels any delayed engine dispatch.
  useEffect(() => {
    if (!inputLocked) return;
    if (!laserArmed) return;

    clearPending();

    setLaserArmed(false);
    setHoverRow(null);
    emitArm(false);
  }, [clearPending, emitArm, inputLocked, laserArmed]);

  const onShellPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!laserArmed) return;

      // While confirm is pending, freeze hover row (visual lockout).
      if (pendingConfirm) return;

      const rect = boardRef?.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
      const h = rect.height;
      if (!(h > 0)) return;

      const y = e.clientY - rect.top;

      // If the pointer is outside the actual board, clear hover so we don't "snap" to row 0/last row.
      if (y < 0 || y > h) {
        setHoverRow(null);
        return;
      }

      const ratio = y / h;
      const row = clampInt(Math.floor(ratio * height), 0, Math.max(0, height - 1));
      setHoverRow(row);
    },
    [boardRef, height, laserArmed, pendingConfirm],
  );

  const onShellPointerLeave = useCallback(() => {
    if (!laserArmed) return;
    if (pendingConfirm) return;
    setHoverRow(null);
  }, [laserArmed, pendingConfirm]);

  const scheduleEngineDispatch = useCallback(
    (p: PendingUse) => {
      if (typeof window === 'undefined') return;

      clearPending();

      pendingRef.current = p;
      setPendingConfirm(true);

      const delayMs = clampInt(LASER_ENGINE_DELAY_MS, 0, 60_000);

      // NOTE:
      // - SFX is already played at confirm-time.
      // - Engine dispatch happens later (delayed).
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;

        // If we got disarmed/cancelled in the meantime, do nothing.
        if (!laserArmedRef.current) {
          clearPending();
          return;
        }

        const pending = pendingRef.current;
        if (!pending) {
          clearPending();
          return;
        }

        // Dispatch to engine bridge.
        window.dispatchEvent(new CustomEvent<PowerUseAtDetail>(POWER_USE_AT_EVENT, { detail: pending.detail }));

        // After we hand off to engine, disarm immediately (engine owns lock/acceptance).
        clearPending();
        setLaserArmed(false);
        setHoverRow(null);
        emitArm(false);
      }, delayMs);
    },
    [clearPending, emitArm],
  );

  const onCellPointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!laserArmed) return;

      e.preventDefault();
      e.stopPropagation();

      // If a confirm is already pending, ignore further clicks.
      if (pendingConfirm) return;

      const safeW = Math.max(0, width | 0);
      const safeH = Math.max(0, height | 0);

      // If board dimensions are invalid, disarm without emitting a malformed event.
      if (!(safeW > 0 && safeH > 0)) {
        clearPending();
        setLaserArmed(false);
        setHoverRow(null);
        emitArm(false);
        return;
      }

      const idx = index | 0;
      const xRaw = idx % safeW;
      const yRaw = Math.floor(idx / safeW);

      const x = clampInt(xRaw, 0, Math.max(0, safeW - 1));
      const y = clampInt(yRaw, 0, Math.max(0, safeH - 1));

      const requestId = allocPowerRequestId();

      // Engine/bridge expects `target:{x,y}`. For row-clear, `y` selects row; `x` is harmless.
      const key = normalizeLaserKeyForEngine(armedKeyRef.current) ?? 'laser';
      const detail: PowerUseAtDetail = { key, target: { x, y }, requestId };

      // 🔊 SFX MUST be immediate (gesture-timed), independent of engine delay.
      // playSfx('laserRow', { volume: 1 });

      // Freeze highlight on the confirmed row while we wait.
      setHoverRow(y);

      scheduleEngineDispatch({ detail, confirmRow: y });
    },
    [clearPending, emitArm, laserArmed, pendingConfirm, scheduleEngineDispatch, width, height],
  );

  return useMemo(
    () => ({
      laserArmed,
      hoverRow,
      onShellPointerMove,
      onShellPointerLeave,
      onCellPointerDown,
    }),
    [hoverRow, laserArmed, onCellPointerDown, onShellPointerLeave, onShellPointerMove],
  );
}
