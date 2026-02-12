// src/features/devtools-host/lib/hud/types.ts

export type HudObjectiveKind = 'spikes' | 'nodes' | 'leaks' | 'terminals' | 'objectiveTerminals' | 'none';

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
    };

export type HudModel = {
  levelId: number;
  movesLeftText: string;
  isWin: boolean;
  isLose: boolean;
  laserWarning: HudLaserWarning | null;
  objective: HudObjective;
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

  laserWarning: HudLaserWarning | null;

  movesLeft: number | string;
  isWin: boolean;
  isLose: boolean;
  objectiveKind: HudObjectiveKind;
};

export type HudActions = {
  // currently informational HUD. Keep this as an extension point for later:
  // openSettings?: () => void;
  // restartRun?: () => void;
  // toggleDevtools?: () => void;
};

export function assertNever(x: never, msg?: string): never {
  // eslint-disable-next-line no-throw-literal
  throw new Error(msg ?? `Unexpected variant: ${String(x)}`);
}
