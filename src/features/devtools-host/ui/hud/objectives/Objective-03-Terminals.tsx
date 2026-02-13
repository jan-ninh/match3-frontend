// src/features/devtools-host/ui/hud/objectives/ObjectiveTerminals.tsx
import type { HudObjective } from '../../../lib/hud/typesHud';

type ObjectiveTerminalsLike = Extract<HudObjective, { kind: 'terminals' }>;

type Props = {
  objective: ObjectiveTerminalsLike;
};

export function ObjectiveTerminals({ objective }: Props) {
  const verified = objective.terminalsVerified | 0;
  const total = objective.terminalsTotal | 0;

  const isDone = total > 0 && verified >= total;

  const title = isDone ? 'All IDs verified!' : 'Deliver ID Cards';
  const hint = 'Only matching the Terminal’s color will charge it—then deliver a Keycard.';

  // Keyline / Glow (match Level 1 style)
  const baseKeyline = 'border-sky-300/18';
  const keyline = isDone ? 'border-emerald-300/18' : baseKeyline;

  const baseGlow = 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(56,189,248,0.12)]';
  const glowA = isDone ? 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]' : baseGlow;

  // Progress segments (match Level 1 style)
  const segTotal = Math.min(Math.max(0, total), 6);
  const segDone = Math.min(Math.max(0, verified), segTotal);

  const baseSegOn = 'bg-sky-400/35 border-sky-300/35';
  const segOn = isDone ? 'bg-emerald-400/35 border-emerald-300/35' : baseSegOn;

  const terminalStates = objective.terminalStates ?? [];

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1) CONTAINER: OBJECTIVE */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={[
          'pointer-events-auto',
          'inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2 mt-4',
          keyline,
          glowA,
        ].join(' ')}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[10px] tracking-[0.28em] text-white/55 uppercase whitespace-nowrap">Objective</div>
          </div>

          <div className="mt-0.5 text-[15px] font-semibold text-white/90 leading-snug truncate">{title}</div>
        </div>

        <div className="hidden sm:block h-7 w-px bg-white/10 shrink-0" aria-hidden="true" />

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            VERIFIED {verified}/{total}
          </div>

          {segTotal > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {Array.from({ length: segTotal }, (_, i) => {
                const d = i < segDone;
                return (
                  <div
                    key={i}
                    className={[
                      'h-2.5 w-4 rounded-full border transition-all duration-200',
                      d ? segOn : 'bg-white/5 border-white/15',
                      d ? 'shadow-[0_0_12px_rgba(255,255,255,0.08)]' : '',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2) CONTAINER: OBJECTIVE DESCRIPTION (HINT + TERMINAL CHIPS) */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={[
          'pointer-events-auto',
          'inline-flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)] overflow-hidden',
        ].join(' ')}
      >
        {/* small-screen progress */}
        <div className="sm:hidden flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            VERIFIED {verified}/{total}
          </div>

          {segTotal > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {Array.from({ length: segTotal }, (_, i) => {
                const d = i < segDone;
                return <div key={i} className={['h-2.5 w-4 rounded-full border', d ? segOn : 'bg-white/5 border-white/15'].join(' ')} />;
              })}
            </div>
          ) : null}

          <div className="text-white/25 shrink-0">•</div>
        </div>

        {/* Terminal chips (Level 03) */}
        {terminalStates.length > 0 ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden shrink-0 max-w-[clamp(10ch,18vw,28ch)]">
              {terminalStates.map((t) => (
                <div
                  key={t.id}
                  className={[
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] shrink-0',
                    t.state === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : t.state === 'open'
                        ? 'bg-sky-500/20 text-sky-200'
                        : 'bg-slate-500/20 text-slate-300',
                  ].join(' ')}
                  title={`T${t.id}: ${t.charge}/${t.required} (${t.state})`}
                >
                  <span className="uppercase">{`T${t.id}`}</span>
                  <span>
                    {t.charge}/{t.required}
                  </span>
                  <span>{t.state === 'verified' ? '✓' : t.state === 'open' ? '⎆' : '🔒'}</span>
                </div>
              ))}
            </div>
            <div className="text-white/25 shrink-0">•</div>
          </>
        ) : null}

        <div className="text-xs text-white/55 whitespace-normal break-words max-w-[clamp(18ch,34vw,60ch)]">{hint}</div>
      </div>
    </>
  );
}
