// src/gamelogic/cascade/effects/effectTypes.ts
import type { EngineEvent, EngineState } from '../../types';
import type { MatchDetection } from '../../match';
import type { CascadeContext } from '../types-cascade';

export type PreClearArgs = {
  state: EngineState;
  match: MatchDetection;
  ctx: CascadeContext;
  events: EngineEvent[];
};

export type PostStageArgs = {
  state: EngineState;
  ctx: CascadeContext;
  events: EngineEvent[];
};

export type StageResult = {
  state: EngineState;
  ctx: CascadeContext;
};

export type CascadeEffect = {
  id: string;
  preClear?: (args: PreClearArgs) => StageResult;
  postClear?: (args: PostStageArgs) => StageResult;
  postGravity?: (args: PostStageArgs) => StageResult;
  postRefill?: (args: PostStageArgs) => StageResult;
};
