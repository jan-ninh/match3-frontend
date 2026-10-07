// src/features/gameplay/lib/hud/typesHud.ts

export type HudObjectiveKind =
  | 'collect'
  | 'spikes'
  | 'nodes'
  | 'leaks'
  | 'terminals'
  | 'objectiveTerminals'
  | 'signal'
  | 'signalBreach'
  | 'matchRush'
  | 'laserRowMatch4'
  | 'none';

export type HudLaserWarning = {
  kind: 'row' | 'col';
  index: number;
};

export type HudTerminalState = {
  id: number;
  state: 'locked' | 'open' | 'verified';
  charge: number;
  required: number;
  color: string;
};

export type HudObjectiveTerminalState = {
  id: number;
  state: 'inactive' | 'active';
  charge: number;
  required: number;
};

export type HudObjective =
  | { kind: 'none' }
  | { kind: 'collect'; pieceType: string; count: number; target: number }
  | { kind: 'matchRush' }
  | { kind: 'laserRowMatch4'; remaining: number; target: number }
  | { kind: 'spikes' | 'nodes'; breachDone: number; breachTotal: number; gateOpen: boolean }
  | {
      kind: 'leaks';
      leaksSealed: number;
      leaksTotal: number;
      contaminationCount: number;
      contaminationThreshold: number | null;
    }
  | {
      kind: 'terminals';
      terminalsVerified: number;
      terminalsTotal: number;
      terminalStates: readonly HudTerminalState[];
    }
  | {
      kind: 'objectiveTerminals';
      activated: number;
      total: number;
      states: readonly HudObjectiveTerminalState[];
    }
  | {
      kind: 'signal';
      linked: boolean;
      chargedCount: number;
    }
  | {
      kind: 'signalBreach';
      linked: boolean;
      breachDone: number;
      breachTotal: number;
    };

export type HudModel = {
  levelId: number;
  movesLeftText: string;
  isWin: boolean;
  isLose: boolean;
  laserWarning: HudLaserWarning | null;
  objective: HudObjective;

  matchRushUnits: number;
  matchRushTargetUnits: number;
  matchRushPercent: number;

  timeLeftSec: number | null;
};

export type GameplayHudInput = {
  levelId: number;

  collectPieceType: string | null;
  collectCount: number;
  collectTarget: number;

  gateOpen: boolean;

  breachDone: number;
  breachTotal: number;

  leaksSealed: number;
  leaksTotal: number;

  contaminationCount: number;
  contaminationThreshold: number | null;

  terminalsVerified: number;
  terminalsTotal: number;
  terminalStates: readonly HudTerminalState[];

  objectiveTerminalsActivated: number;
  objectiveTerminalsTotal: number;
  objectiveTerminalStates: readonly HudObjectiveTerminalState[];

  signalLinked: boolean;
  chargedCellCount: number;
  signalSourcesTotal: number;
  signalTargetsTotal: number;

  matchRushUnits: number;
  matchRushTargetUnits: number;
  matchRushPercent: number;

  timeLeftSec: number | null;

  laserRowMatch4Remaining: number;
  laserRowMatch4Target: number;

  laserWarning: HudLaserWarning | null;

  movesLeft: number | string;
  isWin: boolean;
  isLose: boolean;
  objectiveKind: HudObjectiveKind;
};

export type HudActions = {
  openSettings?: () => void;
  restartRun?: () => void;
  toggleDevtools?: () => void;
};

export function assertNever(x: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected variant: ${String(x)}`);
}
