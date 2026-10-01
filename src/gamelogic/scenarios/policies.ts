import type { ScenarioKey } from './scenarioKeys';
import { getScenarioKeyForStage, isStageId } from '../stages/stageCatalog';

export type SignalLinkMode = 'none' | 'nodes' | 'firewallEndpoints';

export type ScenarioPolicies = Readonly<{
  /** UI intent gating only (engine still validates swaps). */
  manualSwapsDisabled: boolean;

  /** UI inventory rule: do not decrement items on use (ACK still emitted). */
  infiniteItems: boolean;

  /** HUD behavior. */
  hud: Readonly<{
    showMovesWidget: boolean;
    /** MatchRush uses a UI-only timer store; LaserRow training uses engine timeLeftSec; others usually none. */
    timeSource: 'none' | 'matchRushStore' | 'engine';
    showMatchRushBar: boolean;
  }>;

  /** Engine mechanics toggles (must be stable during a run). */
  engine: Readonly<{
    /** Charged-cells / signal pipeline can be used as pure trace even without signal nodes. */
    enableChargedCells: boolean;
    /** Signal link rules. */
    signalLinkMode: SignalLinkMode;
    /** Level 05 mechanic: spawn keycards when Match4+ occurs. */
    keycardSpawnOnMatch4: boolean;
  }>;
}>;

/**
 * SSOT: ScenarioKey → ScenarioPolicies
 *
 * Rule:
 * - NEVER key gameplay semantics off StageId numbers.
 * - StageId may be swapped freely in stageCatalog.ts, and semantics must follow the ScenarioKey.
 */
const SCENARIO_POLICIES: Readonly<Record<ScenarioKey, ScenarioPolicies>> = {
  'clean-room': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'breach-protocol': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'tiberium-run': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    // Uses charged-cell trace mechanic (no signal nodes required).
    engine: { enableChargedCells: true, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'signal-breach': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    // Special: firewall endpoints define the link; link arms dormant firewalls.
    engine: { enableChargedCells: true, signalLinkMode: 'firewallEndpoints', keycardSpawnOnMatch4: false },
  },
  'false-identity': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    // Special: match4+ spawns keycards (engine-owned deterministic).
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: true },
  },
  'patch-the-hole': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'match-rush': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'matchRushStore', showMatchRushBar: true },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'laserrow-match4-training': {
    manualSwapsDisabled: true,
    infiniteItems: true,
    // Moves are not a meaningful constraint here (swaps free, lose-by-moves disabled).
    hud: { showMovesWidget: false, timeSource: 'engine', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'stone-tiles-intro': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'firewall-sweep-bossroom': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    // The sweep uses laser warnings, but that's separate from charged cells.
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'enemy-turn-trace': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    // Uses charged-cell trace mechanic (no signal nodes required).
    engine: { enableChargedCells: true, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'sandbox': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
} as const;

export function getScenarioKeyForLevelId(levelId: number | null): ScenarioKey | null {
  const id = typeof levelId === 'number' && Number.isFinite(levelId) ? (levelId | 0) : 0;
  if (id <= 0) return null;
  if (!isStageId(id)) return null;
  return getScenarioKeyForStage(id);
}

export function getScenarioPoliciesForLevelId(levelId: number | null): ScenarioPolicies | null {
  const key = getScenarioKeyForLevelId(levelId);
  if (!key) return null;
  return SCENARIO_POLICIES[key];
}

export function isScenario(levelId: number | null, scenario: ScenarioKey): boolean {
  return getScenarioKeyForLevelId(levelId) === scenario;
}

// ─────────────────────────────────────────────────────────────
// Transitional helpers (keep existing call sites stable)
// ─────────────────────────────────────────────────────────────

/**
 * LaserRow Match4+ training scenario.
 * Owns: infinite inventory (UI), auto-rearm laser, manual-swap lockout, HUD moves hidden.
 */
export function isLaserRowMatch4TrainingStage(levelId: number | null): boolean {
  return isScenario(levelId, 'laserrow-match4-training');
}

/**
 * Match Rush scenario.
 * Owns: match rush progress bar + time store.
 */
export function isMatchRushStage(levelId: number | null): boolean {
  return isScenario(levelId, 'match-rush');
}

/**
 * Signal Breach scenario (firewall endpoints define link + dormant activation).
 */
export function isSignalBreachStage(levelId: number | null): boolean {
  return isScenario(levelId, 'signal-breach');
}

/**
 * Some scenarios intentionally disable manual swaps (training / special modes).
 * (The engine still validates swaps; this is UI intent gating.)
 */
export function isManualSwapDisabledStage(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.manualSwapsDisabled : false;
}

export function shouldShowMovesWidget(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.hud.showMovesWidget : true;
}

// ─────────────────────────────────────────────────────────────
// Engine policy helpers (ScenarioKey-based; no StageId semantics)
// ─────────────────────────────────────────────────────────────

export function shouldEnableChargedCellsStage(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.engine.enableChargedCells : false;
}

export function getSignalLinkModeForLevelId(levelId: number | null): SignalLinkMode {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.engine.signalLinkMode : 'none';
}

/**
 * Enable signal pipeline (charge + link) if:
 * - scenario explicitly wants charged cells, OR
 * - the LevelDefinition has signal source/target nodes (engine fields).
 *
 * The second clause preserves the "signal network" mechanic for any scenario
 * that uses signal nodes, even if its policies don't explicitly opt-in.
 */
export function shouldEnableSignalPipelineForLevelId(levelId: number | null, signalSourcesTotal: number, signalTargetsTotal: number): boolean {
  if (shouldEnableChargedCellsStage(levelId)) return true;
  return (signalSourcesTotal | 0) > 0 || (signalTargetsTotal | 0) > 0;
}

export function shouldSpawnKeycardsFromMatch4Stage(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.engine.keycardSpawnOnMatch4 : false;
}

export function shouldUseInfiniteItems(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.infiniteItems : false;
}

export function getHudTimeSource(levelId: number | null): 'none' | 'matchRushStore' | 'engine' {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.hud.timeSource : 'none';
}

export function shouldShowMatchRushBar(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.hud.showMatchRushBar : false;
}
