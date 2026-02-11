// src/features/devtools-host/ui/GameplayHud.tsx
type ObjectiveKind = 'nodes' | 'spikes' | 'leaks' | 'terminals' | 'none';

type TerminalHudState = {
  id: number;
  state: 'locked' | 'open' | 'verified';
  charge: number;
  required: number;
  color: string;
};

type Props = {
  levelId: number;

  gateOpen: boolean;

  // Level 01: Firewall breaches
  breachDone: number;
  breachTotal: number;

  // Level 02: Leaks
  leaksSealed: number;
  leaksTotal: number;

  // Level 03: Terminals
  terminalsVerified?: number;
  terminalsTotal?: number;
  terminalStates?: TerminalHudState[];

  // Level 02: Contamination
  contaminationCount: number;
  contaminationThreshold: number | null;

  movesLeft: number | string;

  isWin: boolean;
  isLose: boolean;

  objectiveKind?: ObjectiveKind;
};

export default function GameplayHud({
  levelId,
  gateOpen,
  breachDone,
  breachTotal,
  leaksSealed,
  leaksTotal,
  terminalsVerified = 0,
  terminalsTotal = 0,
  terminalStates = [],
  contaminationCount,
  contaminationThreshold,
  movesLeft,
  isWin,
  isLose,
  objectiveKind = 'nodes',
}: Props) {
  // Determine objective kind (Level 03 overrides)
  const resolvedObjectiveKind: ObjectiveKind = (() => {
    if (terminalsTotal > 0) return 'terminals';
    if (leaksTotal > 0) return 'leaks';
    return objectiveKind;
  })();

  // Determine title based on objective
  const preTitle = (() => {
    switch (resolvedObjectiveKind) {
      case 'terminals':
        return 'Deliver ID Cards';
      case 'spikes':
        return 'Clean Room: remove spikes';
      case 'nodes':
        return 'Crack the Nodes!';
      case 'leaks':
        return 'Patch the Leaks!';
      default:
        return 'Objective';
    }
  })();

  const title = (() => {
    if (resolvedObjectiveKind === 'terminals' && terminalsVerified >= terminalsTotal && terminalsTotal > 0) {
      return 'All IDs verified!';
    }
    if (resolvedObjectiveKind === 'leaks' && leaksSealed >= leaksTotal && leaksTotal > 0) {
      return 'All leaks sealed!';
    }
    if (gateOpen) {
      return 'Exit unlocked';
    }
    return preTitle;
  })();

  // Determine hint based on objective
  const hint = (() => {
    switch (resolvedObjectiveKind) {
      case 'terminals':
        return 'Match adjacent to terminals with the right color to charge them. Deliver keycards to open terminals.';
      case 'spikes':
        return 'Make matches orthogonal to a spike to remove it. Clear them all to unlock the exit.';
      case 'nodes':
        return 'Adjacent matches damage nodes. Break all to unlock the exit.';
      case 'leaks':
        return 'Match near leaks to spawn seal kits. Trigger kits to patch leaks. Clear contamination with matches.';
      default:
        return '';
    }
  })();

  const chip = isWin
    ? { label: 'WIN', cls: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200/90' }
    : isLose
      ? { label: 'LOSE', cls: 'border-rose-300/30 bg-rose-500/10 text-rose-200/90' }
      : null;

  const isTerminalObjective = resolvedObjectiveKind === 'terminals';
  const isLeakObjective = resolvedObjectiveKind === 'leaks';

  // Keyline color based on objective and state
  const baseKeyline = (() => {
    switch (resolvedObjectiveKind) {
      case 'spikes':
        return 'border-white/14';
      case 'leaks':
        return 'border-amber-300/18';
      case 'terminals':
        return 'border-sky-300/18';
      default:
        return 'border-fuchsia-300/18';
    }
  })();

  const keyline = (() => {
    if (isTerminalObjective && terminalsVerified >= terminalsTotal && terminalsTotal > 0) {
      return 'border-emerald-300/18';
    }
    if (isLeakObjective && leaksSealed >= leaksTotal && leaksTotal > 0) {
      return 'border-emerald-300/18';
    }
    if (gateOpen) {
      return 'border-emerald-300/18';
    }
    return baseKeyline;
  })();

  // Glow based on objective and state
  const glowA = (() => {
    if (isTerminalObjective && terminalsVerified >= terminalsTotal && terminalsTotal > 0) {
      return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]';
    }
    if (isLeakObjective && leaksSealed >= leaksTotal && leaksTotal > 0) {
      return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]';
    }
    if (gateOpen) {
      return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]';
    }
    switch (resolvedObjectiveKind) {
      case 'spikes':
        return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(255,255,255,0.08)]';
      case 'leaks':
        return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(251,191,36,0.12)]';
      case 'terminals':
        return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(56,189,248,0.12)]';
      default:
        return 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(217,70,239,0.12)]';
    }
  })();

  // Progress segments
  const segTotal = isTerminalObjective
    ? Math.min(Math.max(0, terminalsTotal), 6)
    : isLeakObjective
      ? Math.min(Math.max(0, leaksTotal), 6)
      : Math.min(Math.max(0, breachTotal), 6);

  const segDone = isTerminalObjective
    ? Math.min(Math.max(0, terminalsVerified), segTotal)
    : isLeakObjective
      ? Math.min(Math.max(0, leaksSealed), segTotal)
      : Math.min(Math.max(0, breachDone), segTotal);

  const segOn = (() => {
    if (isTerminalObjective && terminalsVerified >= terminalsTotal && terminalsTotal > 0) {
      return 'bg-emerald-400/35 border-emerald-300/35';
    }
    if (isLeakObjective && leaksSealed >= leaksTotal && leaksTotal > 0) {
      return 'bg-emerald-400/35 border-emerald-300/35';
    }
    if (gateOpen) {
      return 'bg-emerald-400/35 border-emerald-300/35';
    }
    switch (resolvedObjectiveKind) {
      case 'spikes':
        return 'bg-white/20 border-white/25';
      case 'leaks':
        return 'bg-amber-400/35 border-amber-300/35';
      case 'terminals':
        return 'bg-sky-400/35 border-sky-300/35';
      default:
        return 'bg-fuchsia-400/35 border-fuchsia-300/35';
    }
  })();

  // Contamination warning state
  const contaminationDanger = contaminationThreshold !== null && contaminationCount >= contaminationThreshold * 0.7;
  const contaminationCritical = contaminationThreshold !== null && contaminationCount >= contaminationThreshold * 0.9;

  return (
    <div
      className={[
        // 3-slot layout: left (auto) / center (minmax(0,1fr)) / right (auto)
        'mb-4 w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-start',
        // responsive spacing
        'gap-2 sm:gap-4 px-[clamp(0rem,0.6vw,0.5rem)]',
      ].join(' ')}
    >
      {/* LEVEL */}
      <div
        data-ui="level-badge"
        className="min-w-[112px] text-center rounded-2xl border border-fuchsia-400/20 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(217,70,239,0.16)] justify-self-start"
      >
        <div className="text-2xl font-semibold text-white/90 tabular-nums tracking-wide whitespace-nowrap inline-flex">LEVEL {levelId}</div>
        <div className="text-xs tracking-widest text-fuchsia-200/70 uppercase">Stage</div>
      </div>

      {/* Objective (two compact pills, centered) */}
      <div className="min-w-0 flex justify-center">
        <div className="relative inline-block min-w-0 max-w-full">
          {/* soft scrim, so it pops from BG without "more box height" */}
          <div className="pointer-events-none absolute -inset-5 rounded-[26px] bg-black/40 blur-2xl" aria-hidden="true" />

          <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
            {/* Pill A: Objective */}
            <div className={['inline-flex min-w-0 items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2', keyline, glowA].join(' ')}>
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
                {isTerminalObjective ? (
                  <div className="font-mono text-xs text-white/80 tabular-nums">
                    VERIFIED {terminalsVerified}/{terminalsTotal}
                  </div>
                ) : isLeakObjective ? (
                  <div className="font-mono text-xs text-white/80 tabular-nums">
                    SEALED {leaksSealed}/{leaksTotal}
                  </div>
                ) : (
                  <div className="font-mono text-xs text-white/80 tabular-nums">
                    BREACH {breachDone}/{breachTotal}
                  </div>
                )}

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

            {/* Pill B: Hint + Contamination (Level 02) + Terminals (Level 03) */}
            <div className="inline-flex min-w-0 flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
              {/* show progress only on small screens (since pill A hides it there) */}
              <div className="sm:hidden flex items-center gap-2">
                {isTerminalObjective ? (
                  <div className="font-mono text-xs text-white/80 tabular-nums">
                    VERIFIED {terminalsVerified}/{terminalsTotal}
                  </div>
                ) : isLeakObjective ? (
                  <div className="font-mono text-xs text-white/80 tabular-nums">
                    SEALED {leaksSealed}/{leaksTotal}
                  </div>
                ) : (
                  <div className="font-mono text-xs text-white/80 tabular-nums">
                    BREACH {breachDone}/{breachTotal}
                  </div>
                )}

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

              {/* Contamination counter (Level 02 only) */}
              {isLeakObjective && contaminationThreshold !== null ? (
                <>
                  <div
                    className={[
                      'font-mono text-xs tabular-nums',
                      contaminationCritical ? 'text-rose-300 animate-pulse' : contaminationDanger ? 'text-amber-300' : 'text-white/70',
                    ].join(' ')}
                  >
                    ☣ {contaminationCount}/{contaminationThreshold}
                  </div>
                  <div className="text-white/25">•</div>
                </>
              ) : null}

              {/* Terminal chips (Level 03) */}
              {isTerminalObjective && terminalStates.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {terminalStates.map((t) => (
                      <div
                        key={t.id}
                        className={[
                          'flex items-center gap-1 px-2 py-0.5 rounded text-[10px]',
                          t.state === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : t.state === 'open'
                              ? 'bg-sky-500/20 text-sky-200'
                              : 'bg-slate-500/20 text-slate-300',
                        ].join(' ')}
                      >
                        <span className="uppercase">{(t.color?.[0] ?? '?') as string}</span>
                        <span>
                          {t.charge}/{t.required}
                        </span>
                        <span>{t.state === 'verified' ? '✓' : t.state === 'open' ? '⎆' : '🔒'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-white/25">•</div>
                </>
              ) : null}

              {/* Hint: allow wrapping so it never pushes MOVES out of the stage viewport */}
              <div className="text-xs text-white/55 text-center leading-snug max-w-[60ch]">{hint}</div>
            </div>
          </div>
        </div>
      </div>

      {/* MOVES */}
      <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] justify-self-end">
        <div className="text-2xl font-semibold text-white/90 tabular-nums">{movesLeft}</div>
        <div className="text-xs tracking-widest text-white/60 uppercase">Moves</div>
      </div>
    </div>
  );
}
