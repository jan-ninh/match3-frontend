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

  objectiveIconUrl: string; // kept for compatibility (ignored)
};

export default function GameplayHud({ boardWidth, levelId, gateOpen, breachDone, breachTotal, movesLeft, isWin, isLose }: Props) {
  const innerW = boardWidth * TILE_SIZE + Math.max(0, boardWidth - 1) * GAP;
  const hudW = innerW + BOARD_PADDING * 2;

  const segCap = 5;
  const segTotal = Math.min(Math.max(0, breachTotal), segCap);
  const segDone = Math.min(Math.max(0, breachDone), segTotal);

  const title = gateOpen ? 'Gate opened' : 'Open the Gate';

  const chip = isWin
    ? { label: 'WIN', cls: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200/90' }
    : isLose
      ? { label: 'LOSE', cls: 'border-rose-300/30 bg-rose-500/10 text-rose-200/90' }
      : null;

  const neon = gateOpen
    ? 'shadow-[0_10px_24px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]'
    : 'shadow-[0_10px_24px_rgba(0,0,0,0.55),0_0_22px_rgba(217,70,239,0.12)]';

  const pillKeyline = gateOpen ? 'border-emerald-300/18' : 'border-fuchsia-300/18';

  const segOn = gateOpen ? 'bg-emerald-400/35 border-emerald-300/35' : 'bg-fuchsia-400/35 border-fuchsia-300/35';

  return (
    <div className="mb-4 mx-auto flex flex-col items-center gap-2" style={{ width: hudW, maxWidth: '100%' }}>
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

      {/* Objective: slim pills */}
      <div className="w-full flex justify-center">
        <div className={['w-full max-w-[680px] flex flex-wrap items-center justify-center gap-2', neon].join(' ')}>
          {/* Pill A: Objective */}
          <div className={['inline-flex items-center gap-3 rounded-2xl border bg-black/75 backdrop-blur-xl px-4 py-2.5', pillKeyline].join(' ')}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase">Objective</div>
                {chip ? (
                  <div className={['px-2 py-1 rounded-full border text-[10px] tracking-[0.22em] uppercase', chip.cls].join(' ')}>{chip.label}</div>
                ) : null}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold text-white/90 leading-snug">{title}</div>
            </div>
          </div>

          {/* Pill B: Breach + hint */}
          <div className="inline-flex items-center rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2.5">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs text-white/80 tabular-nums">
                  BREACH {breachDone}/{breachTotal}
                </div>

                {segTotal > 0 ? (
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: segTotal }, (_, i) => {
                      const done = i < segDone;
                      return (
                        <div
                          key={i}
                          className={[
                            'h-2.5 w-4 rounded-full border transition-all duration-200',
                            done ? segOn : 'bg-white/5 border-white/15',
                            done ? 'shadow-[0_0_12px_rgba(255,255,255,0.08)]' : '',
                          ].join(' ')}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="text-xs text-white/55 whitespace-nowrap">Matches near nodes damage them.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
