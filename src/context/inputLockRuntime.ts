import type { EngineState } from '@/gamelogic/types';

export const MATCH3_INPUT_LOCK_CHANGED_EVENT = 'match3:inputLockChanged' as const;

export type Match3InputLockChangedDetail = Readonly<{
  inputLocked: EngineState['inputLocked'];
}>;

let runtimeInputLocked: EngineState['inputLocked'] = false;

export function getRuntimeInputLocked(): EngineState['inputLocked'] {
  return runtimeInputLocked;
}

export function setRuntimeInputLocked(inputLocked: EngineState['inputLocked']): void {
  const next = !!inputLocked;
  if (Object.is(runtimeInputLocked, next)) return;
  runtimeInputLocked = next;

  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<Match3InputLockChangedDetail>(MATCH3_INPUT_LOCK_CHANGED_EVENT, {
      detail: { inputLocked: runtimeInputLocked },
    }),
  );
}
