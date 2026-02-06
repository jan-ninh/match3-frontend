type Props = {
  levelId: number;

  // placeholder for later real timer
  timeValue: number | string;

  gateOpen: boolean;

  breachDone: number;
  breachTotal: number;

  movesLeft: number | string;

  isWin: boolean;
  isLose: boolean;

  objectiveIconUrl: string;
};

export default function GameplayHud({
  levelId,
  timeValue,
  gateOpen,
  breachDone,
  breachTotal,
  movesLeft,
  isWin,
  isLose,
  objectiveIconUrl,
}: Props) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div
        data-ui="level-badge"
        className="min-w-[112px] text-center rounded-2xl border border-fuchsia-400/20 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(217,70,239,0.16)]"
      >
        <div className="text-2xl font-semibold text-white/90 tabular-nums tracking-wide">LEVEL {levelId}</div>
        <div className="text-xs tracking-widest text-fuchsia-200/70 uppercase">Stage</div>
      </div>

      <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-2xl font-semibold text-white/90 tabular-nums">{timeValue}</div>
        <div className="text-xs tracking-widest text-white/60 uppercase">Time</div>
      </div>

      <div className="flex-1 rounded-2xl border border-fuchsia-400/20 bg-black/55 backdrop-blur px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.50)]">
        <div className="text-xs tracking-widest text-fuchsia-200/80 uppercase flex items-center gap-2">
          <span>Objective</span>
          <img src={objectiveIconUrl} alt="" className="w-4 h-4 opacity-80" />
        </div>
        <div className="mt-0.5 text-base font-semibold text-white/90">{gateOpen ? 'Gate opened' : 'Open the Gate'}</div>
        <div data-ui="objective-meta" className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
          <div className="font-mono text-white/80 tabular-nums">
            BREACH {breachDone}/{breachTotal}
          </div>
          <div className="text-white/55">Matches next to a node damage it.</div>
          {isWin ? <div className="text-emerald-300/90 font-semibold">WIN — Gate open</div> : null}
          {isLose ? <div className="text-rose-300/90 font-semibold">LOSE — out of moves</div> : null}
        </div>
      </div>

      <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-2xl font-semibold text-white/90 tabular-nums">{movesLeft}</div>
        <div className="text-xs tracking-widest text-white/60 uppercase">Moves</div>
      </div>
    </div>
  );
}