// src/gamelogic/engine/reducer/post/resolveOutcome.ts
import type { EngineEvent, EngineState } from '../../../types';

import { setPhase } from '../../../phaseState';
import { pushEvents } from '../../events';
import { isSignalLinked } from '../../../board/signal/signalPathCheck';

type WinReason = 'gate' | 'leaks' | 'terminals' | 'objectiveTerminals' | 'signal';
type LoseReason = 'moves' | 'contamination';

function checkWinConditions(state: EngineState): WinReason | null {
  // Level 01: Gate win (all firewalls breached)
  if (state.breachesRemaining <= 0 && state.gateOpen && state.breachesTotal > 0) {
    return 'gate';
  }

  // Level 02+: Leak win (all leaks sealed)
  if (state.leaksTotal > 0 && state.leaksSealed >= state.leaksTotal) {
    return 'leaks';
  }

  // Level 03+: Terminal win (all terminals verified)
  if (state.terminalsTotal > 0 && state.terminalsVerified >= state.terminalsTotal) {
    return 'terminals';
  }

  // Level 04+: Objective Terminal win (all terminals activated)
  if (state.objectiveTerminalsTotal > 0 && state.objectiveTerminalsActivated >= state.objectiveTerminalsTotal) {
    return 'objectiveTerminals';
  }

  // Level 05+: Signal Network win (source connected to target via charged cells)
  if (state.signalSourcesTotal > 0 && state.signalTargetsTotal > 0) {
    if (isSignalLinked(state)) {
      return 'signal';
    }
  }

  return null;
}

function checkLoseConditions(state: EngineState): LoseReason | null {
  // Out of moves
  if (state.movesLeft <= 0) {
    return 'moves';
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

  const winReason = checkWinConditions(state);
  if (winReason) {
    const evs: EngineEvent[] = [];

    // Emit signal-specific event before generic win
    if (winReason === 'signal') {
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
