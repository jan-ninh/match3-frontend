import { useEffect, useRef, useState } from 'react';
import { xyOf } from '@/gamelogic';

export type Axis = 'x' | 'y';

export type DebugSnapshot = {
  active: boolean;
  pointerId: number | null;

  draggable: boolean;

  fromIndex: number | null;
  toIndex: number | null;

  axis: Axis | null;
  exceededThreshold: boolean;

  rawDx: number;
  rawDy: number;

  smoothedDx: number;
  smoothedDy: number;

  previewLatched: boolean;
  previewAxis: Axis | null;
  previewDir: -1 | 0 | 1;
  previewToIndex: number | null;
};

type Props = {
  width: number;
  snapshot: DebugSnapshot;
  hz?: number;
};

function fmtIndex(index: number | null, width: number): string {
  if (index === null) return 'null';
  const { x, y } = xyOf(index, width);
  return `(${x},${y})`;
}

function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : 'NaN';
}

export default function DebugInputPanel({ width, snapshot, hz = 15 }: Props) {
  // simple hz throttle (dev-only panel)
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const intervalMs = Math.max(1, Math.floor(1000 / hz));

    let last = performance.now();

    const loop = (now: number) => {
      const dt = now - last;
      if (dt >= intervalMs) {
        last = now;
        setTick((t) => (t + 1) % 1_000_000);
      }
      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [hz]);

  void tick;

  const s = snapshot;

  const rows = [
    ['active', String(s.active)],
    ['pointerId', String(s.pointerId)],
    ['draggable', String(s.draggable)],
    ['from', fmtIndex(s.fromIndex, width)],
    ['to', fmtIndex(s.toIndex, width)],
    ['axis', String(s.axis)],
    ['exceeded', String(s.exceededThreshold)],
    ['raw', `${fmtNum(s.rawDx)} / ${fmtNum(s.rawDy)}`],
    ['smooth', `${fmtNum(s.smoothedDx)} / ${fmtNum(s.smoothedDy)}`],
    [
      'preview',
      `${String(s.previewLatched)} | ${String(s.previewAxis)} | ${String(s.previewDir)} | ${fmtIndex(s.previewToIndex, width)}`,
    ],
  ] as const;

  return (
    <div className='rounded-2xl p-3 bg-black/30 border border-white/10 shadow-lg w-[280px]'>
      <div className='text-white/80 text-sm font-semibold'>Input Debug</div>
      <div className='mt-2 grid gap-1'>
        {rows.map(([k, v]) => (
          <div key={k} className='flex items-baseline justify-between gap-3 font-mono text-[11px]'>
            <span className='text-white/55'>{k}</span>
            <span className='text-white/85 truncate'>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
