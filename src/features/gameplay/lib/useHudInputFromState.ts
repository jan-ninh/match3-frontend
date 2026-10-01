// src/features/gameplay/lib/useHudInputFromState.ts
import { useMemo } from 'react';
import type { EngineState } from '@/gamelogic';
import type { GameplayHudInput } from '@/features/gameplay/lib/hud/typesHud';
import { isMatchRushStage } from '@/gamelogic/scenarios/policies';

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

type ObjectiveKind = GameplayHudInput['objectiveKind'];

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

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function calcMatchRushPercent(units: number, targetUnits: number): number {
  const t = targetUnits | 0;
  if (t <= 0) return 0;

  const u = units | 0;
  const pct = Math.floor((u / t) * 100);
  return clampInt(pct, 0, 100);
}

function deriveObjectiveKind(args: {
  levelId: number;
  signalSourcesTotal: number;
  signalTargetsTotal: number;
  objectiveTerminalsTotal: number;
  terminalsTotal: number;
  leaksTotal: number;
  laserRowMatch4Target: number;
  cells: EngineState['cells'];
}): ObjectiveKind {
  const { levelId, signalSourcesTotal, signalTargetsTotal, objectiveTerminalsTotal, terminalsTotal, leaksTotal, laserRowMatch4Target, cells } = args;

  // Match Rush scenario
  if (isMatchRushStage(levelId)) return 'matchRush';

  // Level 09+: LaserRow -> Match4+ objective (engine-owned)
  if ((laserRowMatch4Target | 0) > 0) return 'laserRowMatch4';

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
    matchRushUnits,
    matchRushTargetUnits,
    nowMs,
    level9TimerStartSec,
    level9TimerDeadlineAtMs,
    laserRowMatch4Remaining,
    laserRowMatch4Target,
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
      levelId,
      signalSourcesTotal: signalSourcesTotal ?? 0,
      signalTargetsTotal: signalTargetsTotal ?? 0,
      objectiveTerminalsTotal: objectiveTerminalsTotal ?? 0,
      terminalsTotal: terminalsTotal ?? 0,
      leaksTotal: leaksT,
      laserRowMatch4Target: laserRowMatch4Target ?? 0,
      cells,
    });

    const terminalStates = extractTerminalStates(cells);
    const objectiveTerminalStates = extractObjectiveTerminalStates(cells);

    const isWin = phase === 'win';
    const isLose = phase === 'lose';

    const mrUnits = matchRushUnits | 0;
    const mrTarget = matchRushTargetUnits | 0;
    const mrPct = calcMatchRushPercent(mrUnits, mrTarget);

    let timeLeftSec: number | null = null;
    const tStart = level9TimerStartSec | 0;
    if (tStart > 0) {
      const deadline = level9TimerDeadlineAtMs | 0;
      const n = nowMs | 0;
      if (deadline > 0 && n > 0) {
        timeLeftSec = clampInt(Math.ceil((deadline - n) / 1000), 0, 60 * 60);
      } else {
        timeLeftSec = clampInt(tStart, 0, 60 * 60);
      }
    }

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

      matchRushUnits: mrUnits,
      matchRushTargetUnits: mrTarget,
      matchRushPercent: mrPct,
      timeLeftSec,

      laserRowMatch4Remaining: laserRowMatch4Remaining | 0,
      laserRowMatch4Target: laserRowMatch4Target | 0,

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
    matchRushUnits,
    matchRushTargetUnits,
    nowMs,
    level9TimerStartSec,
    level9TimerDeadlineAtMs,
    laserRowMatch4Remaining,
    laserRowMatch4Target,
  ]);
}
