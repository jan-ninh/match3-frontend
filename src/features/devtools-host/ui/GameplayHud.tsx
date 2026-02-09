// src/features/devtools-host/ui/GameplayHud.tsx
type Props = {
  levelId: number;

  gateOpen: boolean;

  breachDone: number;
  breachTotal: number;

  movesLeft: number | string;

  isWin: boolean;
  isLose: boolean;
};

export default function GameplayHud({ levelId, gateOpen, breachDone, breachTotal, movesLeft, isWin, isLose }: Props) {
  const title = gateOpen ? 'Exit unlocked' : 'Crack the Nodes!';

  const chip = isWin
    ? { label: 'WIN', cls: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200/90' }
    : isLose
      ? { label: 'LOSE', cls: 'border-rose-300/30 bg-rose-500/10 text-rose-200/90' }
      : null;

  const keyline = gateOpen ? 'border-emerald-300/18' : 'border-fuchsia-300/18';

  const glowA = gateOpen
    ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]'
    : 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(217,70,239,0.12)]';

  const segCap = 5;
  const segTotal = Math.min(Math.max(0, breachTotal), segCap);
  const segDone = Math.min(Math.max(0, breachDone), segTotal);

  const segOn = gateOpen ? 'bg-emerald-400/35 border-emerald-300/35' : 'bg-fuchsia-400/35 border-fuchsia-300/35';

  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      {/* LEVEL (unchanged) */}
      <div
        data-ui="level-badge"
        className="min-w-[112px] text-center rounded-2xl border border-fuchsia-400/20 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(217,70,239,0.16)]"
      >
        <div className="text-2xl font-semibold text-white/90 tabular-nums tracking-wide">LEVEL {levelId}</div>
        <div className="text-xs tracking-widest text-fuchsia-200/70 uppercase">Stage</div>
      </div>

      {/* Objective (two compact pills, centered) */}
      <div className="flex-1 flex justify-center">
        <div className="relative">
          {/* soft scrim, so it pops from BG without “more box height” */}
          <div className="pointer-events-none absolute -inset-5 rounded-[26px] bg-black/40 blur-2xl" aria-hidden="true" />

          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            {/* Pill A: Objective */}
            <div className={['inline-flex items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2', keyline, glowA].join(' ')}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase">Objective</div>
                  {chip ? (
                    <div className={['ml-1 px-2 py-1 rounded-full border text-[10px] tracking-[0.22em] uppercase', chip.cls].join(' ')}>{chip.label}</div>
                  ) : null}
                </div>

                <div className="mt-0.5 text-[15px] font-semibold text-white/90 leading-snug">{title}</div>
              </div>

              {/* tiny vertical separator */}
              <div className="hidden sm:block h-7 w-px bg-white/10" aria-hidden="true" />

              {/* compact meta on the right (keeps pill small) */}
              <div className="hidden sm:flex items-center gap-2">
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
            </div>

            {/* Pill B: Hint (very slim) */}
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
              {/* show breach only on small screens (since pill A hides it there) */}
              <div className="sm:hidden flex items-center gap-2">
                <div className="font-mono text-xs text-white/80 tabular-nums">
                  BREACH {breachDone}/{breachTotal}
                </div>

                {segTotal > 0 ? (
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: segTotal }, (_, i) => {
                      const done = i < segDone;
                      return <div key={i} className={['h-2.5 w-4 rounded-full border', done ? segOn : 'bg-white/5 border-white/15'].join(' ')} />;
                    })}
                  </div>
                ) : null}

                <div className="text-white/25">•</div>
              </div>

              <div className="text-xs text-white/55 whitespace-nowrap">Adjacent matches damage nodes. Break all 3 to unlock the exit.</div>
            </div>
          </div>
        </div>
      </div>

      {/* MOVES (unchanged) */}
      <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-2xl font-semibold text-white/90 tabular-nums">{movesLeft}</div>
        <div className="text-xs tracking-widest text-white/60 uppercase">Moves</div>
      </div>
    </div>
  );
}
