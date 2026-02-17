// src/features/grid/ui/laser/useLaserRowTargeting.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { POWER_ARM_EVENT, POWER_USE_AT_EVENT } from '@/context/powerEvents';

type Opts = Readonly<{
  width: number;
  height: number;
  inputLocked: boolean;
}>;

type ArmDetailLike = Readonly<{
  key: string;
  armed: boolean;
}>;

type UseAtDetail = Readonly<{
  key: string;
  index: number;
  requestId: number;
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

const LASER_KEYS = new Set<string>(['laser', 'gridlaser', 'laserRow', 'laserRowClear']);

export function useLaserRowTargeting({ width, height, inputLocked }: Opts) {
  const [laserArmed, setLaserArmed] = useState(false);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  // Remember which key variant armed us, so we can disarm the exact same key.
  const armedKeyRef = useRef<string>('laser');

  const emitArm = useCallback((armed: boolean) => {
    if (typeof window === 'undefined') return;
    const key = armedKeyRef.current;
    window.dispatchEvent(new CustomEvent(POWER_ARM_EVENT, { detail: { key, armed } }));
  }, []);

  // Global arm/disarm sync (Footer emits this).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<unknown>;
      const d = ce.detail;

      if (!isArmDetailLike(d)) return;
      if (!LASER_KEYS.has(d.key)) return;

      armedKeyRef.current = d.key;
      setLaserArmed(!!d.armed);
      if (!d.armed) setHoverRow(null);
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, []);

  // Safety: input lock => disarm (prevents stuck targeting).
  useEffect(() => {
    if (!inputLocked) return;
    if (!laserArmed) return;

    setLaserArmed(false);
    setHoverRow(null);
    emitArm(false);
  }, [emitArm, inputLocked, laserArmed]);

  const onShellPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!laserArmed) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const h = rect.height;
      if (!(h > 0)) return;

      const y = e.clientY - rect.top;
      const ratio = y / h;

      const row = clampInt(Math.floor(ratio * height), 0, Math.max(0, height - 1));
      setHoverRow(row);
    },
    [height, laserArmed],
  );

  const onShellPointerLeave = useCallback(() => {
    if (!laserArmed) return;
    setHoverRow(null);
  }, [laserArmed]);

  const onCellPointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!laserArmed) return;

      e.preventDefault();
      e.stopPropagation();

      const requestId = allocPowerRequestId();
      const key = armedKeyRef.current;
      const detail: UseAtDetail = { key, index, requestId };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(POWER_USE_AT_EVENT, { detail }));
      }

      // Disarm immediately after confirm (engine-bridge owns acceptance).
      setLaserArmed(false);
      setHoverRow(null);
      emitArm(false);
    },
    [emitArm, laserArmed],
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
