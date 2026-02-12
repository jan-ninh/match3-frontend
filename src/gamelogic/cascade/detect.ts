// src/gamelogic/cascade/detect.ts
import type { EngineState } from '../types';
import { detectMatches, type MatchDetection } from '../match';

export type { MatchDetection } from '../match';

export function detect(state: EngineState): MatchDetection {
  return detectMatches(state);
}
