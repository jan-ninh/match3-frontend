export type EnginePhase =
  | 'init'
  | 'idle'
  | 'inputLock'
  | 'validate'
  | 'swap'
  | 'swapBack'
  | 'resolveSwapOutcome'
  | 'detect'
  | 'mark'
  | 'clear'
  | 'effectsQueueProcessing'
  | 'gravity'
  | 'refill'
  | 'settle'
  | 'deadlockCheck'
  | 'shuffle'
  // optional (future UI-driven stepping)
  | 'swapAnimating'
  | 'swapBackAnimating'
  | 'fallAnimating';

export function isInputLocked(phase: EnginePhase): boolean {
  return phase !== 'idle';
}

