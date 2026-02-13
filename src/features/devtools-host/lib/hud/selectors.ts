// src/features/devtools-host/lib/hud/selectors.ts
import type { GameplayHudInput, HudModel, HudObjective } from './types-hud';
import { assertNever } from './types-hud';
import { formatMovesLeft } from './format';

function buildObjective(input: GameplayHudInput): HudObjective {
  const k = input.objectiveKind;

  switch (k) {
    case 'spikes':
    case 'nodes':
      return {
        kind: k,
        breachDone: input.breachDone,
        breachTotal: input.breachTotal,
        gateOpen: input.gateOpen,
      };

    case 'leaks':
      return {
        kind: 'leaks',
        leaksSealed: input.leaksSealed,
        leaksTotal: input.leaksTotal,
        contaminationCount: input.contaminationCount,
        contaminationThreshold: input.contaminationThreshold,
      };

    case 'terminals':
      return {
        kind: 'terminals',
        terminalsVerified: input.terminalsVerified,
        terminalsTotal: input.terminalsTotal,
        terminalStates: input.terminalStates,
      };

    case 'objectiveTerminals':
      return {
        kind: 'objectiveTerminals',
        activated: input.objectiveTerminalsActivated,
        total: input.objectiveTerminalsTotal,
        states: input.objectiveTerminalStates,
      };

    case 'signal':
      return {
        kind: 'signal',
        linked: input.signalLinked,
        chargedCount: input.chargedCellCount,
      };

    case 'none':
      return { kind: 'none' };

    default:
      return assertNever(k, 'Unhandled objectiveKind');
  }
}

export function toHudModel(input: GameplayHudInput): HudModel {
  return {
    levelId: input.levelId,
    movesLeftText: formatMovesLeft(input.movesLeft),
    isWin: input.isWin,
    isLose: input.isLose,
    laserWarning: input.laserWarning,
    objective: buildObjective(input),
  };
}
