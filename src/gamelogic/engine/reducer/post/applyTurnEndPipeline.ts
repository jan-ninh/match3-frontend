import type { EngineEvent, EngineState, PendingTurnCommit } from '../../../types';

import { setPhase } from '../../../phaseState';
import { stabilizeBoard } from '../../../cascade';
import { applyGravity } from '../../../cascade/gravity';
import { applyRefill } from '../../../cascade/refill';
import { pushEvents } from '../../events';
import { processKeycardDeliveries } from '../../deliveryFlow';
import { applyTurnEndEffects } from '../../turnEnd';

function shouldRunTurnEnd(commit: PendingTurnCommit): boolean {
  if (commit.kind === 'item') return true;
  // swap only counts as a "turn" if it actually spent a move (match-confirmed)
  return commit.spendMove;
}

export function applyTurnEndPipeline(state: EngineState, commit: PendingTurnCommit): EngineState {
  if (!shouldRunTurnEnd(commit)) return state;

  let s = state;

  // Check for objective terminal win BEFORE turn end effects (Level 04+)
  // This ensures win happens before the sweep damages the board
  if (s.objectiveTerminalsTotal > 0 && s.objectiveTerminalsActivated >= s.objectiveTerminalsTotal) {
    const evs: EngineEvent[] = [];
    s = setPhase(s, 'win', evs);
    evs.push({ type: 'win' });
    return pushEvents(s, evs);
  }

  // Level 02: Leak mechanics
  if (s.leaksTotal > 0) {
    const result = applyTurnEndEffects(s);
    s = pushEvents(result.state, result.events);

    // Check for leak win
    if (result.leakWin) {
      const evs: EngineEvent[] = [];
      s = setPhase(s, 'win', evs);
      evs.push({ type: 'win' });
      return pushEvents(s, evs);
    }

    // Check for contamination lose
    if (result.contaminationLose) {
      const evs: EngineEvent[] = [];
      s = setPhase(s, 'lose', evs);
      evs.push({ type: 'lose' });
      return pushEvents(s, evs);
    }
  }

  // Level 04: Sweep mechanics (if no leak mechanics)
  if (s.sweepEnabled && s.leaksTotal === 0) {
    const result = applyTurnEndEffects(s);
    s = pushEvents(result.state, result.events);

    // Check for contamination lose (sweep can also trigger this)
    if (result.contaminationLose) {
      const evs: EngineEvent[] = [];
      s = setPhase(s, 'lose', evs);
      evs.push({ type: 'lose' });
      return pushEvents(s, evs);
    }

    // Sweep can create holes -> MUST re-stabilize (gravity/refill/cascades) between turns.
    const stabilized = stabilizeBoard(s);
    s = pushEvents(stabilized.state, stabilized.events);

    // If post-sweep stabilization activates objective terminals, win immediately (still same turn).
    if (s.objectiveTerminalsTotal > 0 && s.objectiveTerminalsActivated >= s.objectiveTerminalsTotal) {
      const evs: EngineEvent[] = [];
      s = setPhase(s, 'win', evs);
      evs.push({ type: 'win' });
      return pushEvents(s, evs);
    }
  }

  // Level 03+: Process keycard deliveries
  if (s.terminalsTotal > 0) {
    const deliveryResult = processKeycardDeliveries(s);
    s = pushEvents(deliveryResult.state, deliveryResult.events);

    // Keycard delivery can create holes without any match clears.
    // stabilizeBoard() alone won't settle holes unless detectMatches finds clears.
    // So we explicitly settle (gravity + refill), then stabilize to resolve any auto-matches.
    if (deliveryResult.events.length > 0) {
      const evs: EngineEvent[] = [];

      evs.push({ type: 'phase', phase: 'gravity' });
      s = applyGravity(s);
      evs.push({ type: 'gravity' });

      evs.push({ type: 'phase', phase: 'refill' });
      const ref = applyRefill(s);
      s = ref.state;
      evs.push({ type: 'refilled', count: ref.spawned });

      evs.push({ type: 'phase', phase: 'settle' });

      s = pushEvents(s, evs);

      const stabilized = stabilizeBoard(s);
      s = pushEvents(stabilized.state, stabilized.events);
    }
  }

  return s;
}
