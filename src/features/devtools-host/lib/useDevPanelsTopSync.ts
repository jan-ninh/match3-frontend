import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

type Args = {
  enabled: boolean;
  gridRowRef: RefObject<HTMLDivElement | null>;
  deps?: readonly unknown[];
};

export function useDevPanelsTopSync({ enabled, gridRowRef, deps = [] }: Args) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const stage = document.getElementById('app-stage');
    const row = gridRowRef.current;
    if (!stage || !row) return;

    const stageRect = stage.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();

    const top = Math.max(0, rowRect.top - stageRect.top);
    document.documentElement.style.setProperty('--dev-panels-top', `${top}px`);

    return () => {
      document.documentElement.style.removeProperty('--dev-panels-top');
    };
  }, [enabled, gridRowRef, ...deps]);
}