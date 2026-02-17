import type { Cell, PieceType } from '@/gamelogic';
import { xyOf } from '@/gamelogic';

export type NoneCellVM = {
  kind: 'none';
  index: number;
  x: number;
  y: number;
};

export type GateCellVM = {
  kind: 'gate';
  index: number;
  x: number;
  y: number;
  open: boolean;
};

export type SpikeCellVM = {
  kind: 'spike';
  index: number;
  x: number;
  y: number;
};

export type SweepFirewallCellVM = {
  kind: 'sweepFirewall';
  index: number;
  x: number;
  y: number;
};

export type FirewallNodeCellVM = {
  kind: 'firewallNode';
  index: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

export type LeakCellVM = {
  kind: 'leak';
  index: number;
  x: number;
  y: number;
  progress: number;
  required: number;
  sealed: boolean;
};

export type ContaminationCellVM = {
  kind: 'contamination';
  index: number;
  x: number;
  y: number;
};

export type SealKitCellVM = {
  kind: 'sealKit';
  index: number;
  x: number;
  y: number;
};

export type TerminalCellVM = {
  kind: 'terminal';
  index: number;
  x: number;
  y: number;
  state: 'locked' | 'open' | 'verified';
  charge: number;
  requiredCharge: number;
  chargeColor: PieceType;
};

export type ObjectiveTerminalCellVM = {
  kind: 'objectiveTerminal';
  index: number;
  x: number;
  y: number;
  state: 'inactive' | 'active';
  charge: number;
  requiredCharge: number;
};

export type ChargedCellVM = {
  kind: 'chargedCell';
  index: number;
  x: number;
  y: number;
};

export type SignalSourceCellVM = {
  kind: 'signalSource';
  id: number;
  index: number;
  x: number;
  y: number;
};

export type SignalTargetCellVM = {
  kind: 'signalTarget';
  id: number;
  index: number;
  x: number;
  y: number;
};

export type BlockedPlainCellVM = {
  kind: 'blockedPlain';
  index: number;
  x: number;
  y: number;
};

export type CellVM =
  | NoneCellVM
  | GateCellVM
  | SpikeCellVM
  | SweepFirewallCellVM
  | FirewallNodeCellVM
  | LeakCellVM
  | ContaminationCellVM
  | SealKitCellVM
  | TerminalCellVM
  | ObjectiveTerminalCellVM
  | ChargedCellVM
  | SignalSourceCellVM
  | SignalTargetCellVM
  | BlockedPlainCellVM;

export function buildCellViewModel(cell: Cell, index: number, width: number): CellVM {
  const { x, y } = xyOf(index, width);
  const obs = cell.obstacle;

  if (obs?.kind === 'chargedCell') return { kind: 'chargedCell', index, x, y };

  if (obs?.kind === 'signalSource') return { kind: 'signalSource', id: obs.id, index, x, y };

  if (obs?.kind === 'signalTarget') return { kind: 'signalTarget', id: obs.id, index, x, y };

  if (obs?.kind === 'gate') return { kind: 'gate', index, x, y, open: obs.open };

  if (obs?.kind === 'firewall') {
    // IMPORTANT:
    // - Level 01 spikes are represented as firewall(maxHp=1) and rendered as "spike".
    // - Level 04 sweep spawns firewall(..., origin:'sweep') and must NEVER be rendered as spike.
    const isSweep = obs.origin === 'sweep';
    if (isSweep) return { kind: 'sweepFirewall', index, x, y };

    const isSpike = obs.maxHp === 1;
    if (isSpike) return { kind: 'spike', index, x, y };

    return { kind: 'firewallNode', index, x, y, hp: obs.hp, maxHp: obs.maxHp };
  }

  if (obs?.kind === 'leak') {
    const sealed = obs.progress >= obs.required;
    return { kind: 'leak', index, x, y, progress: obs.progress, required: obs.required, sealed };
  }

  if (obs?.kind === 'contamination') return { kind: 'contamination', index, x, y };

  if (obs?.kind === 'sealKit') return { kind: 'sealKit', index, x, y };

  if (obs?.kind === 'terminal') {
    return {
      kind: 'terminal',
      index,
      x,
      y,
      state: obs.state,
      charge: obs.charge,
      requiredCharge: obs.requiredCharge,
      chargeColor: obs.chargeColor,
    };
  }

  if (obs?.kind === 'objectiveTerminal') {
    return {
      kind: 'objectiveTerminal',
      index,
      x,
      y,
      state: obs.state,
      charge: obs.charge,
      requiredCharge: obs.requiredCharge,
    };
  }

  if (cell.blocked) return { kind: 'blockedPlain', index, x, y };

  return { kind: 'none', index, x, y };
}
