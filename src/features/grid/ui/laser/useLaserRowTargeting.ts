// src/features/grid/ui/laser/useLaserRowTargeting.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  POWER_ARM_EVENT,
  POWER_USE_AT_EVENT,
  type PowerArmDetail,
  type PowerUseAtDetail,
} from '@/context/powerEvents';
import type { PowerKey } from '@/types';

function isLaserKey(key: PowerKey): key is Extract<PowerKey, 'laser'> {
  return key === 'laser';
}

function clampInt(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function allocPowerRequestId(): number {
  if (typeof window === 'undefined') return 1;
  const w = window as unknown as { __match3PowerRequestId?: number };
  const cur = (w.__match3PowerRequestId ?? 1) | 0;
  const next = (cur + 1) | 0;
  w.__match3PowerRequestId = next <= 0 ? 1 : next;
  return cur <= 0 ? 1 : cur;
}

type Opts = {
  width: number;
  height: number;
  inputLocked: boolean;
};

type LaserTargeting = {
  laserArmed: boolean;
  hoverRow: number | null;
  onShellPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onShellPointerLeave: () => void;
  onCellPointerDown: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
};

export function useLaserRowTargeting({ width, height, inputLocked }: Opts): LaserTargeting {
  const [laserArmed, setLaserArmed] = useState(false);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const armedRef = useRef(laserArmed);
  useEffect(() => {
    armedRef.current = laserArmed;
  }, [laserArmed]);

  const emitArm = useCallback((armed: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, {
        detail: { key: 'laser', armed },
      }),
    );
  }, []);

  const emitUseAt = useCallback(
    (index: number) => {
      if (typeof window === 'undefined') return;

      const x = index % width;
      const y = (index / width) | 0;

      const requestId = allocPowerRequestId();

      const detail: PowerUseAtDetail = {
        key: 'laser',
        target: { x, y },
        requestId,
      };

      window.dispatchEvent(new CustomEvent<PowerUseAtDetail>(POWER_USE_AT_EVENT, { detail }));
    },
    [width],
  );

  // Sync local armed-state from global events (footer toggles targeting)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d) return;
      if (!isLaserKey(d.key)) return;
      const next = !!d.armed;
      setLaserArmed(next);
      if (!next) setHoverRow(null);
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, []);

  // If engine locks input while targeting is active (e.g. animations start), disarm.
  useEffect(() => {
    if (!laserArmed) return;
    if (!inputLocked) return;
    emitArm(false);
  }, [emitArm, inputLocked, laserArmed]);

  const onShellPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!armedRef.current) return;
      if (inputLocked) return;

      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const row = clampInt(((relY / Math.max(1, rect.height)) * height) | 0, 0, height - 1);
      setHoverRow(row);
    },
    [height, inputLocked],
  );

  const onShellPointerLeave = useCallback(() => {
    setHoverRow(null);
  }, []);

  const onCellPointerDown = useCallback(
    (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
      if (!armedRef.current) return;
      if (inputLocked) return;

      e.preventDefault();
      e.stopPropagation();

      const y = (index / width) | 0;
      setHoverRow(y);

      emitUseAt(index);
      emitArm(false);
    },
    [emitArm, emitUseAt, inputLocked, width],
  );

  return useMemo(
    () => ({
      laserArmed,
      hoverRow: laserArmed ? hoverRow : null,
      onShellPointerMove,
      onShellPointerLeave,
      onCellPointerDown,
    }),
    [hoverRow, laserArmed, onCellPointerDown, onShellPointerLeave, onShellPointerMove],
  );
}
