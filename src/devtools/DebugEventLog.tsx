import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { EngineEvent } from '@/gamelogic';

function formatEvent(e: EngineEvent): string {
  switch (e.type) {
    case 'seededInit':
      return `seededInit(level=${e.levelId}, ${e.width}x${e.height}, seed=${e.seed})`;
    case 'select':
      return `select(index=${e.index})`;
    case 'selectionCleared':
      return 'selectionCleared()';
    case 'swap':
      return `swap(from=${e.from}, to=${e.to})`;
    case 'swapRejected':
      return `swapRejected(from=${e.from}, to=${e.to}, reason=${e.reason})`;
    default: {
      const _exhaustive: never = e;
      return JSON.stringify(_exhaustive);
    }
  }
}

type Props = {
  events: EngineEvent[];
  maxLines?: number;
};

export default function DebugEventLog({ events, maxLines = 20 }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const lastEventsChrono = useMemo(() => events.slice(-maxLines), [events, maxLines]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  return (
    <div className="w-full lg:w-[420px] rounded-2xl p-3 bg-black/30 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-white/90 font-semibold">Event log</div>
        <div className="text-white/50 text-xs">
          {Math.min(maxLines, events.length)} / {events.length}
        </div>
      </div>

      <div ref={scrollerRef} className="mt-2 h-[420px] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <ul className="space-y-0">
          {lastEventsChrono.map((e, i) => {
            const next = lastEventsChrono[i + 1];
            const isClear = e.type === 'selectionCleared';

            if (isClear) {
              const prev = lastEventsChrono[i - 1];
              const wasInlined = prev && prev.type !== 'selectionCleared';
              if (wasInlined) return null;

              return (
                <Fragment key={i}>
                  <li className="font-mono text-xs text-white/75 whitespace-pre">{formatEvent(e)}</li>
                  <li className="font-mono text-xs whitespace-pre text-white/0 select-none" aria-hidden="true">
                    {'\u00A0'}
                  </li>
                </Fragment>
              );
            }

            const shouldInlineClear = next?.type === 'selectionCleared';

            if (shouldInlineClear) {
              const arrow = '   ---->   ';
              return (
                <Fragment key={i}>
                  <li className="font-mono text-xs text-white/75 whitespace-pre">
                    {formatEvent(e)}
                    {arrow}
                    selectionCleared()
                  </li>
                  <li className="font-mono text-xs whitespace-pre text-white/0 select-none" aria-hidden="true">
                    {'\u00A0'}
                  </li>
                </Fragment>
              );
            }

            return (
              <li key={i} className="font-mono text-xs text-white/75 whitespace-pre">
                {formatEvent(e)}
              </li>
            );
          })}

          <div ref={bottomRef} />
        </ul>
      </div>

      <div className="mt-3 text-xs text-white/50">Drag = swap on release Click = select Click adjacent = swap</div>
    </div>
  );
}
