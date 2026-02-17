import type { CellVM } from '../cellViewModel';
import type { ObstacleSpriteStyles } from '../sprites/getObstacleSpriteStyles';

import { ChargedCellOverlay } from './ChargedCellOverlay';
import { SignalSourceOverlay } from './SignalSourceOverlay';
import { SignalTargetOverlay } from './SignalTargetOverlay';

import { GateOverlay } from './GateOverlay';
import { SpikeOverlay } from './SpikeOverlay';
import { SweepFirewallOverlay } from './SweepFirewallOverlay';
import { FirewallNodeOverlay } from './FirewallNodeOverlay';
import { LeakOverlay } from './LeakOverlay';
import { ContaminationOverlay } from './ContaminationOverlay';
import { SealKitOverlay } from './SealKitOverlay';
import { TerminalOverlay } from './TerminalOverlay';
import { ObjectiveTerminalOverlay } from './ObjectiveTerminalOverlay';
import { BlockedPlainOverlay } from './BlockedPlainOverlay';

type Props = {
  vm: CellVM;
  sprites: ObstacleSpriteStyles;
};

export function CellOverlayRenderer({ vm, sprites }: Props) {
  switch (vm.kind) {
    case 'chargedCell':
      return <ChargedCellOverlay />;

    case 'signalSource':
      return <SignalSourceOverlay id={vm.id} />;

    case 'signalTarget':
      return <SignalTargetOverlay id={vm.id} />;

    case 'gate':
      return <GateOverlay open={vm.open} />;

    case 'spike':
      return <SpikeOverlay spikeSpriteStyle={sprites.spike} />;

    case 'sweepFirewall':
      return <SweepFirewallOverlay />;

    case 'firewallNode':
      return <FirewallNodeOverlay hp={vm.hp} maxHp={vm.maxHp} />;

    case 'leak':
      return (
        <LeakOverlay
          sealed={vm.sealed}
          progress={vm.progress}
          required={vm.required}
          sealedSpriteStyle={sprites.leakSealed}
          openSpriteStyle={sprites.leakOpen}
        />
      );

    case 'contamination':
      return <ContaminationOverlay spriteStyle={sprites.contamination} />;

    case 'sealKit':
      return <SealKitOverlay spriteStyle={sprites.sealKit} />;

    case 'terminal':
      return <TerminalOverlay state={vm.state} charge={vm.charge} requiredCharge={vm.requiredCharge} chargeColor={vm.chargeColor} />;

    case 'objectiveTerminal':
      return <ObjectiveTerminalOverlay state={vm.state} charge={vm.charge} requiredCharge={vm.requiredCharge} />;

    case 'blockedPlain':
      return <BlockedPlainOverlay spriteStyle={sprites.blockedPlain} />;

    case 'none':
      return null;

    default: {
      const _exhaustive: never = vm;
      return _exhaustive;
    }
  }
}
