import { BOARD_PADDING, GAP, TILE_SIZE } from '@/features/grid/lib/constants';

type Props = {
  boardWidth: number;

  levelId: number;

  gateOpen: boolean;

  breachDone: number;
  breachTotal: number;

  movesLeft: number | string;

  isWin: boolean;
  isLose: boolean;

  objectiveIconUrl: string;
};

export default function GameplayHud({ boardWidth, levelId, gateOpen, breachDone, breachTotal, movesLeft, isWin, isLose, objectiveIconUrl }: Props) {
  const innerW = boardWidth * TILE_SIZE + Math.max(0, boardWidth - 1) * GAP;
  const hudW = innerW + BOARD_PADDING * 2;

  const segCap = 6;
  const segTotal = Math.min(Math.max(0, breachTotal), segCap);
  const segDone = Math.min(Math.max(0, breachDone), segTotal);

  const chip = isWin
    ? { label: 'WIN', cls: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200/90 shadow-[0_0_18px_rgba(16,185,129,0.18)]' }
    : isLose
      ? { label: 'LOSE', cls: 'border-rose-300/30 bg-rose-500/10 text-rose-200/90 shadow-[0_0_18px_rgba(244,63,94,0.16)]' }
      : null;

  const objBorder = gateOpen ? 'border-emerald-300/20' : 'border-fuchsia-300/20';
  const objGlow = gateOpen
    ? 'shadow-[0_10px_30px_rgba(0,0,0,0.50),0_0_28px_rgba(16,185,129,0.14)]'
    : 'shadow-[0_10px_30px_rgba(0,0,0,0.50),0_0_28px_rgba(217,70,239,0.14)]';

  return (
    <div className="mb-4 mx-auto flex flex-col items-center gap-3" style={{ width: hudW, maxWidth: '100%' }}>
      {/* Top Rail */}
      <div className="w-full flex items-center gap-3">
        <div
          data-ui="level-badge"
          className="min-w-[132px] text-center rounded-2xl border border-fuchsia-400/20 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(217,70,239,0.14)]"
        >
          <div className="text-2xl font-semibold text-white/90 tabular-nums tracking-wide">LEVEL {levelId}</div>
          <div className="text-[10px] tracking-[0.28em] text-fuchsia-200/70 uppercase">Stage</div>
        </div>

        <div
          aria-hidden="true"
          className="flex-1 h-px rounded-full bg-[linear-gradient(90deg,rgba(217,70,239,0.18),rgba(34,211,238,0.18),rgba(255,255,255,0.06))]"
        />

        <div
          data-ui="moves-badge"
          className="min-w-[112px] text-center rounded-2xl border border-cyan-300/20 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(34,211,238,0.12)]"
        >
          <div className="text-2xl font-semibold text-white/90 tabular-nums">{movesLeft}</div>
          <div className="text-[10px] tracking-[0.28em] text-cyan-100/60 uppercase">Moves</div>
        </div>
      </div>

      {/* Objective Card */}
      <div
        className={[
          'relative inline-block w-fit max-w-full mx-auto overflow-hidden rounded-2xl border bg-black/55 backdrop-blur px-5 py-3',
          objBorder,
          objGlow,
        ].join(' ')}
      >
        {/* Soft neon bloom */}
        <div
          className="pointer-events-none absolute -inset-10 opacity-70"
          style={{
            background: gateOpen
              ? 'radial-gradient(closest-side, rgba(16,185,129,0.16), rgba(0,0,0,0) 70%)'
              : 'radial-gradient(closest-side, rgba(217,70,239,0.16), rgba(0,0,0,0) 70%)',
          }}
        />

        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-[10px] tracking-[0.28em] seen text-white/55 uppercase">Objective</div>
                {chip ? (
                  <div className={['ml-auto px-2 py-1 rounded-full border text-[10px] tracking-[0.22em] uppercase transition-all', chip.cls].join(' ')}>
                    {chip.label}
                  </div>
                ) : null}
              </div>

              <div className="mt-0.5 text-base font-semibold text-white/90">{gateOpen ? 'Gate opened' : 'Open the Gate'}</div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/70">
                {/* Breach segments */}
                <div className="flex items-center gap-2">
                  <div className="font-mono text-white/80 tabular-nums">
                    BREACH {breachDone}/{breachTotal}
                  </div>

                  {segTotal > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: segTotal }, (_, i) => {
                        const done = i < segDone;
                        const cls = done
                          ? gateOpen
                            ? 'border-emerald-300/35 bg-emerald-400/25 shadow-[0_0_14px_rgba(16,185,129,0.18)]'
                            : 'border-fuchsia-300/35 bg-fuchsia-400/25 shadow-[0_0_14px_rgba(217,70,239,0.18)]'
                          : 'border-white/15 bg-white/5';

                        return <div key={i} className={['h-2.5 w-4 rounded-full border transition-all duration-200', cls].join(' ')} aria-hidden="true" />;
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="text-white/55">Matches next to a node damage it.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
