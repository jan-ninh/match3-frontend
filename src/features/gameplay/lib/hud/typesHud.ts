// src/features/gameplay/lib/hud/typesHud.ts

export type HudObjectiveKind =
  | 'spikes'
  | 'nodes'
  | 'leaks'
  | 'terminals'
  | 'objectiveTerminals'
  | 'signal'
  | 'matchRush'
  | 'laserRowMatch4'
  | 'none';

export type HudLaserWarning = {
  kind: 'row' | 'col';
  index: number; // 0..7
};

export type HudTerminalState = {
  id: number;
  state: 'locked' | 'open' | 'verified';
  charge: number;
  required: number;
  color: string; // PieceType (kept as string to avoid engine imports)
};

export type HudObjectiveTerminalState = {
  id: number;
  state: 'inactive' | 'active';
  charge: number;
  required: number;
};

export type HudObjective =
  | { kind: 'none' }
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
    };

export type HudModel = {
  levelId: number;
  movesLeftText: string;
  isWin: boolean;
  isLose: boolean;
  laserWarning: HudLaserWarning | null;
  objective: HudObjective;

  // Level 07: Match Rush (engine-owned progress)
  matchRushUnits: number;
  matchRushTargetUnits: number;
  matchRushPercent: number; // 0..100 (clamped)

  // Level 09: Timer (engine-owned; null when not active)
  timeLeftSec: number | null;
};

export type GameplayHudInput = {
  levelId: number;

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

  // Level 05: Signal Network
  signalLinked: boolean;
  chargedCellCount: number;
  signalSourcesTotal: number;
  signalTargetsTotal: number;

  // Level 07: Match Rush (engine-owned)
  matchRushUnits: number;
  matchRushTargetUnits: number;
  matchRushPercent: number; // 0..100 (clamped)

  // Level 09: Timer (engine-owned; null when not active)
  timeLeftSec: number | null;

  // Level 09: LaserRow -> Match4+ (engine-owned)
  laserRowMatch4Remaining: number;
  laserRowMatch4Target: number;

  laserWarning: HudLaserWarning | null;

  movesLeft: number | string;
  isWin: boolean;
  isLose: boolean;
  objectiveKind: HudObjectiveKind;
};

export type HudActions = {
  // currently informational HUD. Keep this as an extension point for later:
  // Trick: Use optional Signature for now:
  openSettings?: () => void;
  restartRun?: () => void;
  toggleDevtools?: () => void;
};

export function assertNever(x: never, msg?: string): never {
  // eslint-disable-next-line no-throw-literal
  throw new Error(msg ?? `Unexpected variant: ${String(x)}`);
}
