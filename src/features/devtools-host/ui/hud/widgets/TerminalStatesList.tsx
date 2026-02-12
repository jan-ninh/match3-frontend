// src/features/devtools-host/ui/hud/widgets/TerminalStatesList.tsx
import type { HudTerminalState } from '../../../lib/hud/types';

type Props = {
  terminals: readonly HudTerminalState[];
};

function stateLabel(state: HudTerminalState['state']): string {
  switch (state) {
    case 'locked':
      return 'LOCKED';
    case 'open':
      return 'OPEN';
    case 'verified':
      return 'VERIFIED';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function TerminalStatesList({ terminals }: Props) {
  if (terminals.length === 0) {
    return <div className="text-xs text-white/45">No terminals on board.</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {terminals.map((t) => {
        const pct = t.required <= 0 ? 1 : Math.max(0, Math.min(1, t.charge / t.required));

        const stateCls =
          t.state === 'verified'
            ? 'border-emerald-400/20 bg-emerald-500/10'
            : t.state === 'open'
              ? 'border-sky-400/20 bg-sky-500/10'
              : 'border-white/10 bg-white/5';

        return (
          <div key={t.id} className={['rounded-xl border px-2 py-2', stateCls].join(' ')} title={`Terminal ${t.id}: ${t.charge}/${t.required} (${t.state})`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                <div className="text-xs font-semibold text-white/85">T{t.id}</div>
              </div>
              <div className="text-[10px] text-white/60">{stateLabel(t.state)}</div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-[10px] text-white/55">
                {t.charge}/{t.required}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-black/35">
                <div className="h-full bg-white/55" style={{ width: `${Math.round(pct * 100)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
