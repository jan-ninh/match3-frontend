import type { ScenarioKey } from './scenarioKeys';
import { getScenarioKeyForStage, isStageId } from '../stages/stageCatalog';

export function getScenarioKeyForLevelId(levelId: number | null): ScenarioKey | null {
  const id = typeof levelId === 'number' && Number.isFinite(levelId) ? (levelId | 0) : 0;
  if (id <= 0) return null;
  if (!isStageId(id)) return null;
  return getScenarioKeyForStage(id);
}

export function isScenario(levelId: number | null, scenario: ScenarioKey): boolean {
  return getScenarioKeyForLevelId(levelId) === scenario;
}

/**
 * LaserRow Match4+ training scenario.
 * Owns: infinite inventory (UI), auto-rearm laser, manual-swap lockout, HUD moves hidden.
 */
export function isLaserRowMatch4TrainingStage(levelId: number | null): boolean {
  return isScenario(levelId, 'laserrow-match4-training');
}

/**
 * Match Rush scenario.
 * Owns: match rush progress bar + time store.
 */
export function isMatchRushStage(levelId: number | null): boolean {
  return isScenario(levelId, 'match-rush');
}

/**
 * Some scenarios intentionally disable manual swaps (training / special modes).
 * (The engine still validates swaps; this is UI intent gating.)
 */
export function isManualSwapDisabledStage(levelId: number | null): boolean {
  const k = getScenarioKeyForLevelId(levelId);
  if (!k) return false;
  return k === 'laserrow-match4-training';
}

export function shouldShowMovesWidget(levelId: number | null): boolean {
  // LaserRow training: swaps don't spend moves and moves lose is disabled; hide the widget.
  if (isLaserRowMatch4TrainingStage(levelId)) return false;
  return true;
}
