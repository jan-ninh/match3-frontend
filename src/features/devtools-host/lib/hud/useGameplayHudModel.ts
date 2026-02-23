import { useMemo } from 'react';
import type { GameplayHudInput, HudModel } from './typesHud';
import { toHudModel } from './selectors';

export function useGameplayHudModel(input: GameplayHudInput): HudModel {
  // Memo is cheap here and prevents noisy renders if parent passes stable props.
  // (Input is an object, but in practice GameContainer passes primitives + memoized arrays.)
  return useMemo(
    () => toHudModel(input),
    [
      input.levelId,
      input.movesLeft,
      input.isWin,
      input.isLose,
      input.laserWarning?.kind,
      input.laserWarning?.index,

      input.objectiveKind,

      input.gateOpen,
      input.breachDone,
      input.breachTotal,

      input.leaksSealed,
      input.leaksTotal,
      input.contaminationCount,
      input.contaminationThreshold,

      input.terminalsVerified,
      input.terminalsTotal,
      input.terminalStates,

      input.objectiveTerminalsActivated,
      input.objectiveTerminalsTotal,
      input.objectiveTerminalStates,

      input.signalLinked,
      input.chargedCellCount,
      input.signalSourcesTotal,
      input.signalTargetsTotal,

      input.matchRushUnits,
      input.matchRushTargetUnits,
      input.matchRushPercent,
      input.timeLeftSec,

      input.laserRowMatch4Remaining,
      input.laserRowMatch4Target,
    ],
  );
}
