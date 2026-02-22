import type { Cell, EngineEvent, EngineState, ItemEffectKeyForEvent, ItemObstacleDamageRule } from '../../types';
import { applyStoneTileDamageAtIndices } from './stoneTile';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function dedupeValidIndices(state: EngineState, indices: Iterable<number>): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const max = state.cells.length | 0;

  for (const raw of indices) {
    const idx = raw | 0;
    if (idx < 0 || idx >= max) continue;
    if (seen.has(idx)) continue;
    seen.add(idx);
    out.push(idx);
  }

  return out;
}

function neighborsOf(state: EngineState, indices: Iterable<number>): number[] {
  const out = new Set<number>();
  const w = state.width | 0;
  const h = state.height | 0;

  for (const raw of indices) {
    const idx = raw | 0;
    if (idx < 0 || idx >= state.cells.length) continue;

    const x = idx % w;
    const y = Math.floor(idx / w);

    if (x > 0) out.add(idx - 1);
    if (x + 1 < w) out.add(idx + 1);
    if (y > 0) out.add(idx - w);
    if (y + 1 < h) out.add(idx + w);
  }

  return [...out.values()];
}

function openGate(state: EngineState, events: EngineEvent[]): EngineState {
  if (state.gateOpen) return state;

  const nextGateIndices = state.gateIndices ?? [];
  let nextCells: Cell[] | null = null;

  if (nextGateIndices.length > 0) {
    nextCells = state.cells.slice();

    for (const raw of nextGateIndices) {
      const idx = raw | 0;
      if (idx < 0 || idx >= nextCells.length) continue;

      nextCells[idx] = {
        blocked: false,
        pieceId: null,
        obstacle: { kind: 'gate', open: true },
      };
    }
  }

  events.push({ type: 'gateOpened' });

  if (!nextCells) return { ...state, gateOpen: true };
  return { ...state, gateOpen: true, cells: nextCells };
}

function applyFirewallDamageAtTargets(state: EngineState, targets: Iterable<number>, rule: ItemObstacleDamageRule, events: EngineEvent[]): EngineState {
  if ((state.breachesRemaining | 0) <= 0) return state;

  const dmg = clampInt(rule.damage, 0, 1_000_000_000);
  if (dmg <= 0) return state;

  const unique = dedupeValidIndices(state, targets);
  if (unique.length === 0) return state;

  let nextCells: Cell[] | null = null;
  let remaining = state.breachesRemaining | 0;
  let changed = false;

  for (const idx of unique) {
    const cell = (nextCells ?? state.cells)[idx]!;
    const obs = cell.obstacle;

    if (!obs || obs.kind !== 'firewall') continue;

    const hp = obs.hp | 0;
    if (hp <= 0) continue;

    const nextHp = Math.max(0, hp - dmg);
    if (nextHp === hp) continue;

    if (!nextCells) nextCells = state.cells.slice();

    if (nextHp > 0) {
      nextCells[idx] = {
        ...cell,
        obstacle: { ...obs, hp: nextHp, maxHp: obs.maxHp | 0 },
      };
      events.push({ type: 'firewallDamaged', index: idx, hp: nextHp });
      changed = true;
      continue;
    }

    // destroyed
    nextCells[idx] = { blocked: false, pieceId: null };
    if (remaining > 0) remaining -= 1;
    events.push({ type: 'firewallDestroyed', index: idx });
    changed = true;
  }

  if (!changed || !nextCells) return state;

  let nextState: EngineState = {
    ...state,
    cells: nextCells,
    breachesRemaining: Math.max(0, remaining | 0),
  };

  if ((nextState.breachesRemaining | 0) <= 0 && !nextState.gateOpen) {
    nextState = openGate(nextState, events);
  }

  return nextState;
}

function applyStoneTileDamageAtTargets(state: EngineState, targets: Iterable<number>, rule: ItemObstacleDamageRule): EngineState {
  const dmg = clampInt(rule.damage, 0, 1_000_000_000);
  if (dmg <= 0) return state;
  return applyStoneTileDamageAtIndices(state, targets, dmg);
}

function resolveTargetsForRule(state: EngineState, hitIndices: number[], rule: ItemObstacleDamageRule): number[] {
  if (rule.mode === 'adjacent') return neighborsOf(state, hitIndices);
  return hitIndices;
}

export function applyItemObstacleDamageAtIndices(
  state: EngineState,
  itemKey: ItemEffectKeyForEvent,
  hitIndices: Iterable<number>,
  events: EngineEvent[],
): EngineState {
  const rulesForItem = state.itemObstacleDamage[itemKey];
  if (!rulesForItem) return state;

  const hits = dedupeValidIndices(state, hitIndices);
  if (hits.length === 0) return state;

  let s = state;

  // Firewall
  const firewallRule = rulesForItem.firewall;
  if (firewallRule) {
    const targets = resolveTargetsForRule(s, hits, firewallRule);
    s = applyFirewallDamageAtTargets(s, targets, firewallRule, events);
  }

  // Stone Tile
  const stoneRule = rulesForItem.stoneTile;
  if (stoneRule) {
    const targets = resolveTargetsForRule(s, hits, stoneRule);
    s = applyStoneTileDamageAtTargets(s, targets, stoneRule);
  }

  return s;
}

export function countDamageableObstaclesAtIndices(state: EngineState, itemKey: ItemEffectKeyForEvent, indices: Iterable<number>): number {
  const rulesForItem = state.itemObstacleDamage[itemKey];
  if (!rulesForItem) return 0;

  const unique = dedupeValidIndices(state, indices);
  if (unique.length === 0) return 0;

  let count = 0;
  for (const idx of unique) {
    const cell = state.cells[idx]!;
    const obs = cell.obstacle;
    if (!obs) continue;

    const rule = rulesForItem[obs.kind];
    if (!rule) continue;

    const dmg = clampInt(rule.damage, 0, 1_000_000_000);
    if (dmg <= 0) continue;

    count++;
  }

  return count;
}
