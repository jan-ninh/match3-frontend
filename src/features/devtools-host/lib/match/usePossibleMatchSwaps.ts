// src/features/devtools-host/lib/match/usePossibleMatchSwaps.ts
import { useMemo } from 'react';

import { findPossibleMatchSwaps } from '@/gamelogic/match';
import type { PossibleMatchSwap } from '@/gamelogic/match';

type MatchState = Parameters<typeof findPossibleMatchSwaps>[0];

export function usePossibleMatchSwaps(args: {
  enabled: boolean;
  state: MatchState;
}): readonly PossibleMatchSwap[] {
  return useMemo<readonly PossibleMatchSwap[]>(() => {
    if (!args.enabled) return [];
    return findPossibleMatchSwaps(args.state);
  }, [args.enabled, args.state.cells, args.state.height, args.state.pieces, args.state.width]);
}
