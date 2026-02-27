import type { EngineState } from '../../types';
import type { CascadeEffect } from './typesEffects';

import { firewallDamageEffect } from './level01/firewallDamage';
import { contaminationEffect } from './level02/contamination';
import { sealKitsEffect } from './level02/sealKits';
import { terminalsChargeEffect } from './level03_04/terminals';
import { sweepFirewallClearEffect } from './level04/sweepFirewallClear';
import { signalChargeEffect } from './level05/signalCharge';
import { signalLinkEffect } from './level05/signalLink';
import { matchRushProgressEffect } from './level07/matchRushProgress';
import { stoneTileDamageEffect } from './level08/stoneTileDamage';
import { shouldEnableSignalPipelineForLevelId } from '../../scenarios/policies';

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
  // Charged Cells / Signal pipeline (ScenarioKey-owned, not StageId-owned)
  // - Some scenarios reuse charged cells as a pure "trace" mechanic (no signal nodes required).
  // - Any scenario with signal nodes should still get the pipeline.
  if (shouldEnableSignalPipelineForLevelId(state.levelId, state.signalSourcesTotal, state.signalTargetsTotal)) {
    effects.push(signalChargeEffect);
    effects.push(signalLinkEffect);
  }


  // Level 07: Match Rush progress (static toggle via matchRushTargetUnits)
  if ((state.matchRushTargetUnits | 0) > 0) {
    effects.push(matchRushProgressEffect);
  }

  // Level 08: Stone Tiles (match-adjacent damage)
  if ((state.stoneTilesTotal | 0) > 0) {
    effects.push(stoneTileDamageEffect);
  }

  return effects;
}
