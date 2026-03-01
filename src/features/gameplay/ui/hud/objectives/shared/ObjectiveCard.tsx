// src/features/gameplay/ui/hud/objectives/shared/ObjectiveCard.tsx
import type { ReactNode } from 'react';

import type { ObjectiveTheme } from './objectiveThemes';

export type ObjectiveDescItem = {
  key: string;
  node: ReactNode;
};

type Props = {
  title: string;
  hint: string;

  statLabel: string;
  done: number;
  total: number;

  theme: ObjectiveTheme;

  /**
   * Optional inline elements shown in the description row (e.g. terminal chips).
   * Each item will be followed by a small dot separator on sm+.
   */
  descItems?: readonly ObjectiveDescItem[];

  /**
   * Extra classes applied to both containers (e.g. "pointer-events-auto").
   */
  containerClassName?: string;
};

const DONE_KEYLINE = 'border-emerald-300/18';
const DONE_GLOW = 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.12)]';
const DONE_SEG_ON = 'bg-emerald-400/35 border-emerald-300/35';

function clampInt(n: number, min: number, max: number): number {
  const v = n | 0;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export function ObjectiveCard({ title, hint, statLabel, done, total, theme, descItems = [], containerClassName }: Props) {
  const d = done | 0;
  const t = total | 0;

  const isDone = t > 0 && d >= t;

  const keyline = isDone ? DONE_KEYLINE : theme.keylineBase;
  const glowA = isDone ? DONE_GLOW : theme.glowBase;

  // Progress segments (cap at 6)
  const segTotal = clampInt(t, 0, 6);
  const segDone = clampInt(d, 0, segTotal);

  const segOn = isDone ? DONE_SEG_ON : theme.segOnBase;

  const rootClass = containerClassName ?? '';

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1) CONTAINER: OBJECTIVE */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={[
          rootClass,
          'inline-flex min-w-0 max-w-full items-center gap-3 rounded-2xl border bg-black/80 backdrop-blur-xl px-4 py-2 mt-4',
          keyline,
          glowA,
        ]
          .filter(Boolean)
          .join(' ')}
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
            {statLabel} {d}/{t}
          </div>

          {segTotal > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {Array.from({ length: segTotal }, (_, i) => {
                const isFilled = i < segDone;
                return (
                  <div
                    key={i}
                    className={[
                      'h-2.5 w-4 rounded-full border transition-all duration-200',
                      isFilled ? segOn : 'bg-white/5 border-white/15',
                      isFilled ? 'shadow-[0_0_12px_rgba(255,255,255,0.08)]' : '',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2) CONTAINER: OBJECTIVE DESCRIPTION (HINT + OPTIONAL INLINE ITEMS) */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={[
          rootClass,
          'inline-flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl px-4 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.45)] overflow-hidden',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* small-screen progress */}
        <div className="sm:hidden flex items-center gap-2 shrink-0">
          <div className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
            {statLabel} {d}/{t}
          </div>

          {segTotal > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {Array.from({ length: segTotal }, (_, i) => {
                const isFilled = i < segDone;
                return (
                  <div
                    key={i}
                    className={['h-2.5 w-4 rounded-full border', isFilled ? segOn : 'bg-white/5 border-white/15'].join(' ')}
                  />
                );
              })}
            </div>
          ) : null}

          <div className="text-white/25 shrink-0">•</div>
        </div>

        {descItems.map((it) => (
          <div key={it.key} className="contents">
            {it.node}
            <div className="text-white/25 shrink-0">•</div>
          </div>
        ))}

        <div className="text-xs text-white/55 whitespace-normal break-words max-w-[clamp(18ch,34vw,60ch)]">{hint}</div>
      </div>
    </>
  );
}
