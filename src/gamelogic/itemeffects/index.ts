import type { EngineEvent, EngineState } from '../types';
import type { CascadePreStep } from '../cascade/typesCascade';

import type { BombTarget } from './bomb';
import { applyBomb3x3, getBomb3x3IndicesFromTarget } from './bomb';
import type { LaserTarget } from './laser';
import { applyLaserRow, getLaserRowIndicesFromTarget, getLaserRowPreSteps } from './laser';

export type ItemEffectKey = 'bomb3x3' | 'laserRow';

export type ItemTarget = BombTarget | LaserTarget;

export type ItemEffectApplyResult = {
  state: EngineState;
  events: EngineEvent[];
  previewIndices: number[];
};

export function getItemEffectPreviewIndices(key: ItemEffectKey, target: ItemTarget, width: number, height: number): number[] {
  switch (key) {
    case 'bomb3x3':
      return getBomb3x3IndicesFromTarget(target, width, height);
    case 'laserRow':
      return getLaserRowIndicesFromTarget(target, width, height);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/**
 * Optional preStep planner.
 * - returns `undefined` when the item is not modeled as preSteps
 * - returns `[]` when it *is* modeled as preSteps but would be a no-op (ignore)
 */
export function getItemEffectPreSteps(state: EngineState, key: ItemEffectKey, target: ItemTarget): CascadePreStep[] | undefined {
  switch (key) {
    case 'laserRow':
      return getLaserRowPreSteps(state, target);
    default:
      return undefined;
  }
}

export function applyItemEffectAt(state: EngineState, key: ItemEffectKey, target: ItemTarget): ItemEffectApplyResult {
  switch (key) {
    case 'bomb3x3': {
      const res = applyBomb3x3(state, target);
      return { state: res.state, events: res.events, previewIndices: res.clearedIndices };
    }
    case 'laserRow': {
      const res = applyLaserRow(state, target);
      return { state: res.state, events: res.events, previewIndices: res.clearedIndices };
    }
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
