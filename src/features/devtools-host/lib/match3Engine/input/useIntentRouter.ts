import { useCallback, useEffect, useRef } from 'react';

import type { EngineAction } from '@/gamelogic';
import { canSwap } from '@/gamelogic';
import type { EngineState } from '@/gamelogic/types';

type Args = Readonly<{
  dispatch: (a: EngineAction) => void;

  width: number;
  height: number;
  cells: EngineState['cells'];

  allocPowerRequestId: (maybe: unknown) => number;
}>;

export function useIntentRouter({ dispatch, width, height, cells, allocPowerRequestId }: Args) {
  const canSwapAt = useCallback(
    (from: number, to: number) => {
      return canSwap(from, to, width, cells).ok;
    },
    [width, cells],
  );

  // Keep current grid dims for event-driven handlers (avoids recreating input controllers each render).
  const gridDimsRef = useRef<{ width: number; height: number }>({ width, height });
  useEffect(() => {
    gridDimsRef.current = { width, height };
  }, [width, height]);

  const onIntent = useCallback(
    (intent: unknown) => {
      const i = intent as unknown as {
        type?: unknown;
        index?: unknown;
        from?: unknown;
        to?: unknown;
        target?: unknown;
        requestId?: unknown;
      };
      if (i?.type === 'click' && typeof i.index === 'number') {
        const idx = i.index;
        if (!Number.isFinite(idx)) return;

        const dims = gridDimsRef.current;
        if (dims.width <= 0 || dims.height <= 0) return;

        const max = dims.width * dims.height;
        if (idx < 0 || idx >= max) return;

        const x = idx % dims.width;
        const y = Math.floor(idx / dims.width);

        dispatch({
          type: 'clickCell',
          // Compatibility: different reducer versions may read different fields.
          index: idx,
          cellIndex: idx,
          x,
          y,
          target: { x, y },
          nowMs: performance.now(),
        } as EngineAction);
        return;
      }

      if (i?.type === 'swap' && typeof i.from === 'number' && typeof i.to === 'number') {
        dispatch({ type: 'swapAttempt', from: i.from, to: i.to, nowMs: performance.now() } as EngineAction);
        return;
      }

      // Legacy route: convert useBombAt intents to useItemAt (prevents reducer crash)
      if (i?.type === 'useBombAt') {
        const t = i.target as { x?: unknown; y?: unknown } | undefined;
        if (t && typeof t.x === 'number' && typeof t.y === 'number') {
          const requestId = allocPowerRequestId(i.requestId);

          dispatch({
            type: 'useItemAt',
            key: 'bomb3x3',
            target: { x: t.x | 0, y: t.y | 0 },
            requestId,
            nowMs: performance.now(),
          } as EngineAction);
          return;
        }
      }

      dispatch(intent as EngineAction);
    },
    [allocPowerRequestId, dispatch],
  );

  return { canSwapAt, onIntent };
}
