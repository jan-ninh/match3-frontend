import type { ReactElement } from 'react';

export type LaserWarning = {
  kind: 'row' | 'col';
  index: number;
};

type Props = {
  warning: LaserWarning | null | undefined;
};

export function LaserWarningBadge({ warning }: Props): ReactElement | null {
  if (!warning) return null;

  // const label = warning.kind === 'row' ? `ROW ${warning.index + 1}` : `COL ${warning.index + 1}`;

  return (
    <div
      data-ui="laser-warning"
      className={[
        // layout
        'pointer-events-none',
        'mt-1 w-fit max-w-full',
        'px-3 py-2',
        'inline-flex items-center gap-2',

        // make it feel "urgent"
        'uppercase',
        'text-[12px] sm:text-[13px]',
        'font-mono font-semibold',
        'tracking-[0.22em]',

        // square + aggressive frame
        'rounded-none',
        'border border-red-400/55',
        'ring-1 ring-red-500/15',

        // glass + danger tint
        'bg-gradient-to-r from-red-500/22 via-black/35 to-red-500/22',
        'backdrop-blur-md',

        // threatening glow + depth
        'shadow-[0_14px_38px_rgba(0,0,0,0.70),0_0_26px_rgba(248,113,113,0.24)]',

        // make it hard to ignore
        'animate-pulse',
        'text-red-100',
      ].join(' ')}
      aria-live="polite"
    >
      <span className="text-red-100/90">⚠</span>
      <span className="whitespace-nowrap">NEXT SWEEP</span>
      {/* <span className="text-red-200/80">/</span> */}
      {/* <span className="whitespace-nowrap">{label}</span> */}
    </div>
  );
}
