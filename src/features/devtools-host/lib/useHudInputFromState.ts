// src/features/devtools-host/lib/useHudInputFromState.ts
import { useMemo } from 'react';
import type { EngineState } from '@/gamelogic';
import type { GameplayHudInput } from '@/features/devtools-host/lib/hud/types';

type TerminalHudState = {
  id: number;
  state: 'locked' | 'open' | 'verified';
  charge: number;
  required: number;
  color: string;
};

type ObjectiveTerminalHudState = {
  id: number;
  state: 'inactive' | 'active';
  charge: number;
  required: number;
};

type ObjectiveKind = 'spikes' | 'nodes' | 'leaks' | 'terminals' | 'objectiveTerminals' | 'signal' | 'none';

function countContamination(cells: EngineState['cells']): number {
  let n = 0;
  for (const c of cells) {
    if (c.obstacle?.kind === 'contamination') n++;
  }
  return n;
}

function countChargedCells(cells: EngineState['cells']): number {
  let n = 0;
  for (const c of cells) {
    if (c.obstacle?.kind === 'chargedCell') n++;
  }
  return n;
}

function deriveObjectiveKind(args: {
  signalSourcesTotal: number;
  signalTargetsTotal: number;
  objectiveTerminalsTotal: number;
  terminalsTotal: number;
  leaksTotal: number;
  cells: EngineState['cells'];
}): ObjectiveKind {
  const { signalSourcesTotal, signalTargetsTotal, objectiveTerminalsTotal, terminalsTotal, leaksTotal, cells } = args;

  // Level 05: Signal Network takes priority
  if (signalSourcesTotal > 0 && signalTargetsTotal > 0) return 'signal';

  if (objectiveTerminalsTotal > 0) return 'objectiveTerminals';
  if (terminalsTotal > 0) return 'terminals';
  if (leaksTotal > 0) return 'leaks';

  const hasFirewall = cells.some((c) => c.obstacle?.kind === 'firewall');
  if (!hasFirewall) return 'none';

  const looksLikeSpikes = cells.some((c) => c.obstacle?.kind === 'firewall' && c.obstacle.maxHp <= 1);
  return looksLikeSpikes ? 'spikes' : 'nodes';
}

function extractTerminalStates(cells: EngineState['cells']): TerminalHudState[] {
  const terminals: TerminalHudState[] = [];

  for (const cell of cells) {
    const obs = cell.obstacle;
    if (obs?.kind === 'terminal') {
      terminals.push({
        id: obs.id,
        state: obs.state,
        charge: obs.charge,
        required: obs.requiredCharge,
        color: obs.chargeColor,
      });
    }
  }

  return terminals.sort((a, b) => a.id - b.id);
}

function extractObjectiveTerminalStates(cells: EngineState['cells']): ObjectiveTerminalHudState[] {
  const terminals: ObjectiveTerminalHudState[] = [];

  for (const cell of cells) {
    const obs = cell.obstacle;
    if (obs?.kind === 'objectiveTerminal') {
      terminals.push({
        id: obs.id,
        state: obs.state,
        charge: obs.charge,
        required: obs.requiredCharge,
      });
    }
  }

  return terminals.sort((a, b) => a.id - b.id);
}

/**
 * Derives GameplayHudInput from EngineState.
 * Memoized to avoid unnecessary re-renders.
 */
export function useHudInputFromState(state: EngineState): GameplayHudInput {
  const {
    levelId,
    gateOpen,
    breachesTotal,
    breachesRemaining,
    leaksTotal,
    leaksSealed,
    contaminationLoseThreshold,
    cells,
    terminalsVerified,
    terminalsTotal,
    objectiveTerminalsActivated,
    objectiveTerminalsTotal,
    signalSourcesTotal,
    signalTargetsTotal,
    signalLinked,
    chargedCellCount,
    laserWarning,
    movesLeft,
    phase,
  } = state;

  return useMemo(() => {
    const breachTotal = breachesTotal ?? 0;
    const breachLeft = breachesRemaining ?? 0;
    const breachDone = Math.max(0, breachTotal - breachLeft);

    const leaksT = leaksTotal ?? 0;
    const leaksS = leaksSealed ?? 0;

    const contaminationThreshold = contaminationLoseThreshold ?? null;
    const contaminationCount = countContamination(cells);

    // Count charged cells from cells (in case chargedCellCount is stale)
    const actualChargedCount = countChargedCells(cells);

    const objectiveKind = deriveObjectiveKind({
      signalSourcesTotal: signalSourcesTotal ?? 0,
      signalTargetsTotal: signalTargetsTotal ?? 0,
      objectiveTerminalsTotal: objectiveTerminalsTotal ?? 0,
      terminalsTotal: terminalsTotal ?? 0,
      leaksTotal: leaksT,
      cells,
    });

    const terminalStates = extractTerminalStates(cells);
    const objectiveTerminalStates = extractObjectiveTerminalStates(cells);

    const isWin = phase === 'win';
    const isLose = phase === 'lose';

    return {
      levelId,
      gateOpen,
      breachDone,
      breachTotal,
      leaksSealed: leaksS,
      leaksTotal: leaksT,
      contaminationCount,
      contaminationThreshold,
      terminalsVerified: terminalsVerified ?? 0,
      terminalsTotal: terminalsTotal ?? 0,
      terminalStates,
      objectiveTerminalsActivated: objectiveTerminalsActivated ?? 0,
      objectiveTerminalsTotal: objectiveTerminalsTotal ?? 0,
      objectiveTerminalStates,
      signalLinked: signalLinked ?? false,
      chargedCellCount: chargedCellCount ?? actualChargedCount,
      signalSourcesTotal: signalSourcesTotal ?? 0,
      signalTargetsTotal: signalTargetsTotal ?? 0,
      laserWarning,
      movesLeft: movesLeft ?? '—',
      isWin,
      isLose,
      objectiveKind,
    };
  }, [
    levelId,
    gateOpen,
    breachesTotal,
    breachesRemaining,
    leaksTotal,
    leaksSealed,
    contaminationLoseThreshold,
    cells,
    terminalsVerified,
    terminalsTotal,
    objectiveTerminalsActivated,
    objectiveTerminalsTotal,
    signalSourcesTotal,
    signalTargetsTotal,
    signalLinked,
    chargedCellCount,
    laserWarning,
    movesLeft,
    phase,
  ]);
}
