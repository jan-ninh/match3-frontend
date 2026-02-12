// src/gamelogic/cascade/effects/registry.ts
import type { EngineState } from '../../types';
import type { CascadeEffect } from './effectTypes';

import { firewallDamageEffect } from './level01/firewallDamage';
import { contaminationEffect } from './level02/contamination';
import { sealKitsEffect } from './level02/sealKits';
import { terminalsChargeEffect } from './level03_04/terminals';
import { sweepFirewallClearEffect } from './level04/sweepFirewallClear';
import { signalChargeEffect } from './level05/signalCharge';

export function getCascadeEffectsForState(state: EngineState): readonly CascadeEffect[] {
  // IMPORTANT: only use *static per-level* toggles here (prevents "effect list changes mid-resolve")
  const effects: CascadeEffect[] = [];

  if (state.breachesTotal > 0) {
    effects.push(firewallDamageEffect);
  }

  if (state.leaksTotal > 0) {
    // order matters: first clear contamination, then consume kits, then spawn kits
    effects.push(contaminationEffect);
    effects.push(sealKitsEffect);
  }

  if (state.terminalsTotal > 0 || state.objectiveTerminalsTotal > 0) {
    effects.push(terminalsChargeEffect);
  }

  // Level 04: Sweep-spawned firewall clear (static toggle via sweepEnabled)
  if (state.sweepEnabled) {
    effects.push(sweepFirewallClearEffect);
  }

  // Level 05: Signal Network charge effect
  if (state.signalSourcesTotal > 0 || state.signalTargetsTotal > 0) {
    effects.push(signalChargeEffect);
  }

  return effects;
}
