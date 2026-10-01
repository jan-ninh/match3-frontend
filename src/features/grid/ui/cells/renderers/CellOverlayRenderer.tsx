// src/features/grid/ui/cells/renderers/CellOverlayRenderer.tsx
import type { CellVM } from '../cellViewModel';
import type { ObstacleSpriteStyles } from '../sprites/getObstacleSpriteStyles';

import { ChargedCellOverlay } from './ChargedCellOverlay';
import { EnemyRedCellOverlay } from './EnemyRedCellOverlay';
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
import { StoneTileOverlay } from './StoneTileOverlay';

type Props = {
  vm: CellVM;
  sprites: ObstacleSpriteStyles;
};

export function CellOverlayRenderer({ vm, sprites }: Props) {
  switch (vm.kind) {
    case 'enemyRed':
      return <EnemyRedCellOverlay />;

    case 'chargedCell':
      return <ChargedCellOverlay />;

    case 'signalSource':
      return (
        <>
          <ChargedCellOverlay />
          <SignalSourceOverlay id={vm.id} />
        </>
      );

    case 'signalTarget':
      return (
        <>
          <ChargedCellOverlay />
          <SignalTargetOverlay id={vm.id} />
        </>
      );

    case 'gate':
      return <GateOverlay open={vm.open} />;

    case 'spike':
      return <SpikeOverlay spikeSpriteStyle={sprites.spike} />;

    case 'sweepFirewall':
      return <SweepFirewallOverlay />;

    case 'firewallNode':
      return <FirewallNodeOverlay hp={vm.hp} maxHp={vm.maxHp} />;

    case 'stoneTile':
      return <StoneTileOverlay stage={vm.stage} />;

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

    case 'terminal': {
      // Level 05: two adjacent terminals are rendered as ONE combined 2-cell slab (purely visual).
      // SSOT for positions (for now): (3,7) + (4,7)
      const pairRole =
        vm.y === 7 && vm.x === 3 ? ('left' as const) : vm.y === 7 && vm.x === 4 ? ('right' as const) : undefined;

      return (
        <TerminalOverlay
          state={vm.state}
          charge={vm.charge}
          requiredCharge={vm.requiredCharge}
          chargeColor={vm.chargeColor}
          pairRole={pairRole}
        />
      );
    }

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
