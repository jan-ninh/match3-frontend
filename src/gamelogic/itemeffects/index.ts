import type { EngineEvent, EngineState } from '../types';

import type { BombTarget } from './bomb';
import { applyBomb3x3, getBomb3x3IndicesFromTarget } from './bomb';

export type ItemEffectKey = 'bomb3x3';

export type ItemTarget = BombTarget;

export type ItemEffectApplyResult = {
  state: EngineState;
  events: EngineEvent[];
  previewIndices: number[];
};

export function getItemEffectPreviewIndices(key: ItemEffectKey, target: ItemTarget, width: number, height: number): number[] {
  switch (key) {
    case 'bomb3x3':
      return getBomb3x3IndicesFromTarget(target, width, height);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function applyItemEffectAt(state: EngineState, key: ItemEffectKey, target: ItemTarget): ItemEffectApplyResult {
  switch (key) {
    case 'bomb3x3': {
      const res = applyBomb3x3(state, target);
      return { state: res.state, events: res.events, previewIndices: res.clearedIndices };
    }
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
