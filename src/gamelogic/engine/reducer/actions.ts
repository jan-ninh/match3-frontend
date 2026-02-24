// src/gamelogic/engine/reducer/actions.ts
import type { LevelId } from '../../types';
import type { ItemEffectKey, ItemTarget } from '../../itemeffects';

export type InitSeedPolicy = 'random' | 'fixedBase';

export type InitLevelAction = {
  type: 'initLevel';
  levelId: LevelId;
  /**
   * Optional explicit seed override (takes precedence over seedPolicy).
   * Must be an integer; 0 will be normalized to 1.
   */
  seed?: number;
  /**
   * Seed selection policy if `seed` override is not provided.
   * - random (default): engine picks a random 32-bit seed
   * - fixedBase: engine uses the LevelDefinition.baseSeed
   */
  seedPolicy?: InitSeedPolicy;
  nowMs?: number;
};

export type ClickCellAction = { type: 'clickCell'; index: number; nowMs?: number };
export type ResetBoardAction = { type: 'resetBoard'; nowMs?: number };
export type SwapAttemptAction = { type: 'swapAttempt'; from: number; to: number; nowMs?: number };

// Enemy turn: request the engine to perform one random match-creating swap (player-like animation).
export type EnemyTurnAction = { type: 'enemyTurn'; nowMs?: number };

// Power/Item effects targeting confirm (engine-owned)
export type UseItemAtAction = { type: 'useItemAt'; key: ItemEffectKey; target: ItemTarget; requestId: number; nowMs?: number };

// Utility power (free action): reshuffle board without turn-end
export type ReshuffleAction = { type: 'reshuffle'; requestId: number; nowMs?: number };

// animation timing (single source of truth; UI may update via setSwapMs)
export type SetSwapMsAction = { type: 'setSwapMs'; swapMs: number; nowMs?: number };

// time injection / wake-up (no-op except nowMs + auto-finish)
export type WakeAction = { type: 'wake'; nowMs: number };

// engine-owned time
export type TickAction = { type: 'tick'; nowMs: number };

// optional UI "done" signals (never the only escape hatch)
export type SwapAnimDoneAction = { type: 'swapAnimDone'; token: number; nowMs?: number };
export type SwapBackAnimDoneAction = { type: 'swapBackAnimDone'; token: number; nowMs?: number };
export type FallAnimDoneAction = { type: 'fallAnimDone'; token: number; nowMs?: number };

export type EngineAction =
  | InitLevelAction
  | ClickCellAction
  | ResetBoardAction
  | SwapAttemptAction
  | EnemyTurnAction
  | UseItemAtAction
  | ReshuffleAction
  | SetSwapMsAction
  | WakeAction
  | TickAction
  | SwapAnimDoneAction
  | SwapBackAnimDoneAction
  | FallAnimDoneAction;
