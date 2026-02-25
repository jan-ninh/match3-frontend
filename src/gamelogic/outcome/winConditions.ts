import type { EngineState } from '../types';

import { isSignalLinked } from '../board/signal/signalPathCheck';

export type WinReason = 'matchRush' | 'laserRowMatch4' | 'stoneTiles' | 'gate' | 'leaks' | 'terminals' | 'objectiveTerminals' | 'signal';

export function getWinReasonIfMet(state: EngineState): WinReason | null {
  // Level 07: MatchRush win
  if ((state.matchRushTargetUnits | 0) > 0 && (state.matchRushUnits | 0) >= (state.matchRushTargetUnits | 0)) {
    return 'matchRush';
  }

  // Level 09: LaserRow -> Match4+ (engine-owned countdown)
  if ((state.laserRowMatch4Target | 0) > 0 && (state.laserRowMatch4Remaining | 0) <= 0) {
    return 'laserRowMatch4';
  }

  // Level 08: Stone Tiles win (all destroyed)
  if ((state.stoneTilesTotal | 0) > 0 && (state.stoneTilesRemaining | 0) <= 0) {
    return 'stoneTiles';
  }

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

  // Level 03/04/05+: Signal Network
  if (state.signalSourcesTotal > 0 && state.signalTargetsTotal > 0) {
    const linked = state.signalLinked || isSignalLinked(state);
    if (!linked) return null;

    // Level 04 variant: link arms dormant firewalls; win requires both destroyed.
    if (state.levelId === 4) {
      if (state.breachesTotal > 0 && state.breachesRemaining <= 0) {
        return 'signal';
      }
      return null;
    }

    // Default signal rule: link is enough.
    return 'signal';
  }

  return null;
}
