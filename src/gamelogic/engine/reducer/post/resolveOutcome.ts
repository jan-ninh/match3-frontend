import type { EngineEvent, EngineState } from '../../../types';

import { setPhase } from '../../../phaseState';
import { getWinReasonIfMet } from '../../../outcome/winConditions';
import { pushEvents } from '../../events';

type LoseReason = 'moves' | 'timer' | 'contamination';

function checkLoseConditions(state: EngineState): LoseReason | null {
  // Out of moves (level-configurable)
  if (state.movesLoseEnabled && state.movesLeft <= 0) {
    return 'moves';
  }

  // Level 09: Timer lose (engine-owned)
  const startSec = state.level9TimerStartSec | 0;
  if (startSec > 0) {
    const deadline = state.level9TimerDeadlineAtMs | 0;
    if (deadline > 0 && state.nowMs >= deadline) {
      return 'timer';
    }
  }

  // Contamination threshold (Level 02+)
  if (state.contaminationLoseThreshold !== null) {
    let contaminationCount = 0;
    for (const cell of state.cells) {
      if (cell.obstacle?.kind === 'contamination') contaminationCount++;
    }
    if (contaminationCount >= state.contaminationLoseThreshold) {
      return 'contamination';
    }
  }

  return null;
}

export function resolveOutcomeIfIdle(state: EngineState): EngineState {
  if (state.phase !== 'idle') return state;

  const winReason = getWinReasonIfMet(state);
  if (winReason) {
    const evs: EngineEvent[] = [];

    // Emit signal-specific event only if the engine hasn't emitted it yet.
    // (Signal-link moment is handled by cascade effect `signalLinkEffect`.)
    if (winReason === 'signal' && state.signalLinked !== true) {
      evs.push({ type: 'signalLinked' });
    }

    const s = setPhase(state, 'win', evs);
    evs.push({ type: 'win' });
    return pushEvents(s, evs);
  }

  const loseReason = checkLoseConditions(state);
  if (loseReason) {
    const evs: EngineEvent[] = [];
    const s = setPhase(state, 'lose', evs);
    evs.push({ type: 'lose' });
    return pushEvents(s, evs);
  }

  return state;
}
