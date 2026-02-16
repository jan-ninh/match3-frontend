import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Options = {
  laneId?: string;
};

export function useDevPanelsPortal(enabled: boolean, panels: ReactNode, options: Options = {}): ReactNode {
  const laneId = options.laneId ?? 'dev-left-lane';

  const [laneEl, setLaneEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLaneEl(null);
      return;
    }
    if (typeof document === 'undefined') return;

    setLaneEl(document.getElementById(laneId) as HTMLElement | null);
  }, [enabled, laneId]);

  if (!enabled || !laneEl) return null;
  return createPortal(panels, laneEl);
}
