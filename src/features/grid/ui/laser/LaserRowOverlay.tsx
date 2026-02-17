// src/features/grid/ui/laser/LaserRowOverlay.tsx
import { useMemo } from 'react';

type Props = {
  row: number | null;
  height: number;
  zIndex?: number;
};

export function LaserRowOverlay({ row, height, zIndex = 46 }: Props) {
  const style = useMemo<React.CSSProperties | null>(() => {
    if (row == null) return null;
    if (height <= 0) return null;

    const topPct = (row / height) * 100;
    const hPct = 100 / height;

    return {
      top: `${topPct}%`,
      height: `${hPct}%`,
    };
  }, [height, row]);

  if (!style) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex }} aria-hidden="true">
      <div
        className={[
          'absolute left-0 right-0',
          'rounded-[10px]',
          'border border-cyan-300/35',
          'bg-cyan-300/10',
          'shadow-[0_0_22px_rgba(34,211,238,0.28)]',
          'backdrop-blur-[1px]',
        ].join(' ')}
        style={style}
      />
      <div
        className={['absolute left-0 right-0 h-px', 'bg-cyan-200/70', 'shadow-[0_0_12px_rgba(34,211,238,0.42)]'].join(' ')}
        style={{ top: `calc(${style.top} + (${style.height} / 2))` }}
      />
    </div>
  );
}
