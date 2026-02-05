export type EnginePhase =
  | 'init'
  | 'idle'
  | 'inputLock'
  | 'detect'
  | 'mark'
  | 'clear'
  | 'gravity'
  | 'refill'
  | 'settle'
  | 'deadlockCheck'
  | 'shuffle'
  | 'swapAnimating'
  | 'swapBackAnimating';

export function isInputLocked(phase: EnginePhase): boolean {
  return phase !== 'idle';
}

export function isAnimatingPhase(phase: EnginePhase): boolean {
  return phase === 'swapAnimating' || phase === 'swapBackAnimating';
}

export function animKindForPhase(phase: EnginePhase): 'swap' | 'swapBack' | null {
  if (phase === 'swapAnimating') return 'swap';
  if (phase === 'swapBackAnimating') return 'swapBack';
  return null;
}
