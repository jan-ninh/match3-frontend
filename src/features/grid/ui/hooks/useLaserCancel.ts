import { useEffect } from 'react';
import type { RefObject } from 'react';

import { POWER_ARM_EVENT, type PowerArmDetail } from '@/context/powerEvents';

export type UseLaserCancelOpts = Readonly<{
  enabled: boolean;
  boardRef: RefObject<HTMLElement | null>;
}>;

// While in LASER targeting mode, allow quick cancel:
// - Right mouse button (anywhere)
// - Click outside the grid board
// This only DISARMS (no inventory spend).
//
// IMPORTANT BUGFIX:
// RMB inside the grid must NOT trigger the laser "use-at" handler.
// So we swallow RMB at the global capture listener (and Grid's cell handler guards RMB too).
export function useLaserCancel({ enabled, boardRef }: UseLaserCancelOpts) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const emitDisarmLaser = () => {
      const ev = new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, {
        detail: { key: 'laser', armed: false },
      });
      window.dispatchEvent(ev);
    };

    const onGlobalContextMenu = (e: Event) => {
      // Right-click => cancel targeting.
      // Prevent the browser context menu while targeting to avoid accidental UI interruptions.
      if (e instanceof MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      emitDisarmLaser();
    };

    const onGlobalPointerDown = (e: Event) => {
      if (!(e instanceof PointerEvent)) return;

      // RMB => cancel + swallow so Grid cell handlers do not fire.
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        emitDisarmLaser();
        return;
      }

      // Left click outside board => cancel (do NOT swallow; user may want the click to go through).
      if (e.button !== 0) return;

      const boardEl = boardRef.current;
      if (!boardEl) return;

      const t = e.target;
      if (t instanceof Node && !boardEl.contains(t)) {
        emitDisarmLaser();
      }
    };

    window.addEventListener('contextmenu', onGlobalContextMenu, { capture: true });
    window.addEventListener('pointerdown', onGlobalPointerDown, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', onGlobalContextMenu, true);
      window.removeEventListener('pointerdown', onGlobalPointerDown, true);
    };
  }, [boardRef, enabled]);
}
