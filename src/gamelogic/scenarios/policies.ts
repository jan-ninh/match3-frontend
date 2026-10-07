import type { ScenarioKey } from './scenarioKeys';
import { getScenarioKeyForStage, isStageId } from '../stages/stageCatalog';

export type SignalLinkMode = 'none' | 'nodes' | 'firewallEndpoints';

export type ScenarioPolicies = Readonly<{
  manualSwapsDisabled: boolean;
  infiniteItems: boolean;
  hud: Readonly<{
    showMovesWidget: boolean;
    timeSource: 'none' | 'matchRushStore' | 'engine';
    showMatchRushBar: boolean;
  }>;
  engine: Readonly<{
    enableChargedCells: boolean;
    signalLinkMode: SignalLinkMode;
    keycardSpawnOnMatch4: boolean;
  }>;
}>;

const SCENARIO_POLICIES: Readonly<Record<ScenarioKey, ScenarioPolicies>> = {
  'level1-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: false, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level2-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level3-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level4-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level6-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: true, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level7-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level8-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: true, signalLinkMode: 'firewallEndpoints', keycardSpawnOnMatch4: false },
  },
  'level9-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level10-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'level11-redesign': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: true, signalLinkMode: 'firewallEndpoints', keycardSpawnOnMatch4: false },
  },
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
    engine: { enableChargedCells: true, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'signal-breach': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
    engine: { enableChargedCells: true, signalLinkMode: 'firewallEndpoints', keycardSpawnOnMatch4: false },
  },
  'false-identity': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
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
    engine: { enableChargedCells: false, signalLinkMode: 'none', keycardSpawnOnMatch4: false },
  },
  'enemy-turn-trace': {
    manualSwapsDisabled: false,
    infiniteItems: false,
    hud: { showMovesWidget: true, timeSource: 'none', showMatchRushBar: false },
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

export function isLaserRowMatch4TrainingStage(levelId: number | null): boolean {
  return isScenario(levelId, 'laserrow-match4-training');
}

export function isMatchRushStage(levelId: number | null): boolean {
  return isScenario(levelId, 'match-rush');
}

export function isSignalBreachStage(levelId: number | null): boolean {
  return getSignalLinkModeForLevelId(levelId) === 'firewallEndpoints';
}

export function isManualSwapDisabledStage(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.manualSwapsDisabled : false;
}

export function shouldShowMovesWidget(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.hud.showMovesWidget : true;
}

export function shouldEnableChargedCellsStage(levelId: number | null): boolean {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.engine.enableChargedCells : false;
}

export function getSignalLinkModeForLevelId(levelId: number | null): SignalLinkMode {
  const p = getScenarioPoliciesForLevelId(levelId);
  return p ? p.engine.signalLinkMode : 'none';
}

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
