// src\features\devtools-host\ui\DevPanels.tsx
import { createPortal } from 'react-dom';

import type { EngineEvent } from '@/gamelogic';
import { DebugEventLog } from '@/devtools';
import { useNavigate } from 'react-router';

type Props = {
  enabled: boolean;
  events: EngineEvent[];
  onDevWin: () => void | Promise<void>;
  onDevLose: () => void | Promise<void>;
  onDevResetProgress: () => void | Promise<void>;
};

export default function DevPanels({ enabled, events, onDevWin, onDevLose, onDevResetProgress }: Props) {
  const rightLane = typeof document !== 'undefined' ? (document.getElementById('dev-right-lane') as HTMLElement | null) : null;
  const navigate = useNavigate();
  if (!enabled || !rightLane) return null;

  return createPortal(
    <div className="min-w-[320px] max-w-[520px] w-full flex flex-col gap-3 pointer-events-auto">
      <DebugEventLog events={events} />

      <div className="rounded-xl border border-white/10 bg-black/35 backdrop-blur p-3">
        <div className="text-xs tracking-widest text-white/60 uppercase mb-2">Dev Wiring</div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onDevWin()}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-300/20 text-emerald-100/90"
          >
            Win (unlock next)
          </button>

          <button
            type="button"
            onClick={() => void onDevLose()}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-300/20 text-rose-100/90"
          >
            Lose (reset + lvl1)
          </button>

          <button
            type="button"
            onClick={() => void onDevResetProgress()}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
          >
            Reset Progress
          </button>
          <button
            type="button"
            onClick={() => navigate(`/game-map`)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
          >
            Return to map
          </button>
        </div>
      </div>
    </div>,
    rightLane,
  );
}
