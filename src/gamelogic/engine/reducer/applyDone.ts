// src/gamelogic/engine/reducer/applyDone.ts
import type { EngineState } from '../../types';

import { applyFallAnimDone } from '../fallFlow';
import { applySwapAnimDone, applySwapBackAnimDone } from '../swapFlow';

export type DoneKind = 'swap' | 'swapBack' | 'fall';

export type SwapDoneMode = Parameters<typeof applySwapAnimDone>[2];
export type SwapBackDoneMode = Parameters<typeof applySwapBackAnimDone>[2];
export type FallDoneMode = Parameters<typeof applyFallAnimDone>[2];

export type DoneMode = SwapDoneMode | SwapBackDoneMode | FallDoneMode;

export type ApplyDone = (st: EngineState, kind: DoneKind, tok: number, mode: DoneMode) => EngineState;

export const applyDone: ApplyDone = (st, kind, tok, mode) => {
  switch (kind) {
    case 'swap':
      return applySwapAnimDone(st, tok, mode as SwapDoneMode);
    case 'swapBack':
      return applySwapBackAnimDone(st, tok, mode as SwapBackDoneMode);
    case 'fall':
      return applyFallAnimDone(st, tok, mode as FallDoneMode);
    default:
      throw new Error(`Unhandled done kind: ${kind}`);
  }
};
