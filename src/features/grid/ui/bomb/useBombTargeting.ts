import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import { computeBombOverlayIndices, pickBombHoverTargetFromLocal } from './bombMath';
import { POWER_ARM_EVENT, POWER_USE_AT_EVENT, type BombTarget, type PowerArmDetail, type PowerUseAtDetail } from './typesBomb';

type Args = {
  width: number;
  height: number;

  // Engine-relevant lockout (prevents overlapping actions).
  inputLocked: boolean;

  // Optional: stage element id used for viewport-level listeners.
  stageElementId?: string;
};

export type BombTargetingApi = Readonly<{
  bombArmed: boolean;
  bombHoverTarget: BombTarget | null;
  bombOverlayIndices: readonly number[];

  boardRef: RefObject<HTMLDivElement | null>;

  onShellPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onShellPointerLeave: () => void;

  onCellPointerDown: (index: number, e: ReactPointerEvent<HTMLButtonElement>) => void;

  disarm: () => void;
}>;

export function useBombTargeting({ width, height, inputLocked, stageElementId = 'app-stage' }: Args): BombTargetingApi {
  const [bombArmed, setBombArmed] = useState(false);
  const [bombHoverTarget, _setBombHoverTarget] = useState<BombTarget | null>(null);

  const bombHoverTargetRef = useRef<BombTarget | null>(null);
  const lastHoverKeyRef = useRef<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const setBombHoverTarget = useCallback((t: BombTarget | null) => {
    bombHoverTargetRef.current = t;
    _setBombHoverTarget(t);
  }, []);

  const clearBombHover = useCallback(() => {
    lastHoverKeyRef.current = null;
    setBombHoverTarget(null);
  }, [setBombHoverTarget]);

  const disarm = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed: false } }));
    }
    clearBombHover();
  }, [clearBombHover]);

  // Listen to global power arm/disarm (GameFooter drives this)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;

      const armed = !!d.armed;
      setBombArmed(armed);
      if (!armed) clearBombHover();
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, [clearBombHover]);

  const confirmBombAt = useCallback(
    (target: BombTarget) => {
      if (inputLocked) return;

      const indices = computeBombOverlayIndices(target, width, height);
      // if no red target would exist -> abort targeting
      if (indices.length === 0) {
        disarm();
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<PowerUseAtDetail>(POWER_USE_AT_EVENT, { detail: { key: 'bomb', target } }));
        window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed: false } }));
      }

      clearBombHover();
    },
    [inputLocked, width, height, clearBombHover, disarm],
  );

  const updateBombHoverFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = boardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      const t = pickBombHoverTargetFromLocal({ localX, localY, width, height });

      if (!t) {
        if (lastHoverKeyRef.current !== null) clearBombHover();
        return;
      }

      const key = `${t.x},${t.y}`;
      if (lastHoverKeyRef.current !== key) {
        lastHoverKeyRef.current = key;
        setBombHoverTarget(t);
      }
    },
    [width, height, clearBombHover, setBombHoverTarget],
  );

  // Viewport-level Bomb Targeting (HUD + outside-board)
  // - right click/contextmenu => abort + disarm
  // - left click without red target => abort + disarm
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const stageEl = document.getElementById(stageElementId);
    if (!stageEl) return;

    if (bombArmed) stageEl.classList.add('match3-cursor-crosshair');
    else stageEl.classList.remove('match3-cursor-crosshair');

    if (!bombArmed) return;

    const isInsideStage = (clientX: number, clientY: number) => {
      const r = stageEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    };

    const abort = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      disarm();
    };

    const onMove = (e: PointerEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) {
        clearBombHover();
        return;
      }
      updateBombHoverFromClient(e.clientX, e.clientY);
    };

    const onLeave = () => {
      clearBombHover();
    };

    const onDown = (e: PointerEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) return;

      // Right click => abort
      if (e.button === 2) {
        abort(e);
        return;
      }

      // Only left click confirms (and owns the click in bomb mode)
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      updateBombHoverFromClient(e.clientX, e.clientY);

      const t = bombHoverTargetRef.current;
      if (!t) {
        disarm();
        return;
      }

      // if this target would not render any red tiles => abort
      const indices = computeBombOverlayIndices(t, width, height);
      if (indices.length === 0) {
        disarm();
        return;
      }

      confirmBombAt(t);
    };

    // Context menu (right click) => abort + no browser menu
    const onContextMenu = (e: MouseEvent) => {
      if (!isInsideStage(e.clientX, e.clientY)) return;
      abort(e);
    };

    stageEl.addEventListener('pointermove', onMove);
    stageEl.addEventListener('pointerleave', onLeave);
    stageEl.addEventListener('pointerdown', onDown, { capture: true });
    stageEl.addEventListener('contextmenu', onContextMenu, { capture: true });

    return () => {
      stageEl.removeEventListener('pointermove', onMove);
      stageEl.removeEventListener('pointerleave', onLeave);
      stageEl.removeEventListener('pointerdown', onDown, true);
      stageEl.removeEventListener('contextmenu', onContextMenu, true);
      stageEl.classList.remove('match3-cursor-crosshair');
    };
  }, [stageElementId, bombArmed, clearBombHover, updateBombHoverFromClient, confirmBombAt, disarm, width, height]);

  const bombOverlayIndices = useMemo(() => {
    if (!bombArmed) return [];
    if (!bombHoverTarget) return [];
    return computeBombOverlayIndices(bombHoverTarget, width, height);
  }, [bombArmed, bombHoverTarget, width, height]);

  const onShellPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      updateBombHoverFromClient(e.clientX, e.clientY);
    },
    [updateBombHoverFromClient],
  );

  const onShellPointerLeave = useCallback(() => {
    clearBombHover();
  }, [clearBombHover]);

  const onCellPointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      // Right click on cell => abort
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        disarm();
        return;
      }

      if (e.button !== 0) return;
      if (inputLocked) return;

      const x = index % width;
      const y = Math.floor(index / width);

      confirmBombAt({ x, y });
    },
    [confirmBombAt, disarm, inputLocked, width],
  );

  return {
    bombArmed,
    bombHoverTarget,
    bombOverlayIndices,
    boardRef,
    onShellPointerMove,
    onShellPointerLeave,
    onCellPointerDown,
    disarm,
  };
}
