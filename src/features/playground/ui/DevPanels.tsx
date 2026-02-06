import { createPortal } from 'react-dom';

import type { EngineEvent } from '@/gamelogic';
import { DebugEventLog } from '@/devtools';

type Props = {
  enabled: boolean;
  events: EngineEvent[];
};

export default function DevPanels({ enabled, events }: Props) {
  const rightLane = typeof document !== 'undefined' ? (document.getElementById('dev-right-lane') as HTMLElement | null) : null;

  if (!enabled || !rightLane) return null;

  return createPortal(
    <div className="min-w-[320px] max-w-[520px] w-full">
      <DebugEventLog events={events} />
    </div>,
    rightLane,
  );
}