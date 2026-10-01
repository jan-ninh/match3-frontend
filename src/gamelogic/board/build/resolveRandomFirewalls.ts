import type { FirewallNodeDef, LevelDefinition } from '../../types';
import { deriveSeed, initRngState, rngShuffleInPlace, type RngState } from '../../rng';

const MAX_ATTEMPTS = 256;

function isBorderIndex(index: number, width: number, height: number): boolean {
  const x = index % width;
  const y = Math.floor(index / width);
  return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}

function neighbors8(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const out: number[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width) continue;
      if (ny < 0 || ny >= height) continue;
      out.push(ny * width + nx);
    }
  }

  return out;
}

function placeNoTriples8(
  candidates: readonly number[],
  width: number,
  height: number,
  count: number,
  rng0: RngState,
): { indices: number[]; rng: RngState } {
  if (count <= 0) return { indices: [], rng: rng0 };
  if (candidates.length < count) {
    throw new Error(`resolveRandomFirewalls: not enough candidates (need=${count}, have=${candidates.length})`);
  }

  let rng = rng0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pool = candidates.slice();
    const shuffled = rngShuffleInPlace(rng, pool);
    rng = shuffled.state;

    const selected: number[] = [];
    const degree = new Map<number, 0 | 1>();

    for (const idx of shuffled.arr) {
      if (selected.length >= count) break;

      let adjacentHit: number | null = null;
      const n8 = neighbors8(idx, width, height);

      for (const n of n8) {
        if (!degree.has(n)) continue;
        if (adjacentHit !== null) {
          adjacentHit = -1;
          break;
        }
        adjacentHit = n;
      }

      if (adjacentHit === -1) continue; // would give idx degree>1

      if (adjacentHit === null) {
        selected.push(idx);
        degree.set(idx, 0);
        continue;
      }

      // adjacent to exactly one existing firewall -> both nodes must be degree 0
      const d = degree.get(adjacentHit);
      if (d !== 0) continue;

      selected.push(idx);
      degree.set(adjacentHit, 1);
      degree.set(idx, 1);
    }

    if (selected.length === count) {
      return { indices: selected, rng };
    }
  }

  throw new Error(`resolveRandomFirewalls: failed to place (count=${count}, attempts=${MAX_ATTEMPTS})`);
}

function uniqueAppend(base: readonly number[], add: readonly number[]): number[] {
  const out = base.slice();
  const set = new Set<number>(base);
  for (const n of add) {
    if (set.has(n)) continue;
    set.add(n);
    out.push(n);
  }
  return out;
}

function collectOccupied(level: LevelDefinition): Set<number> {
  const out = new Set<number>();

  for (const i of level.blockedIndices) out.add(i);
  for (const i of level.gateIndices) out.add(i);
  for (const n of level.leakNodes) out.add(n.index);
  for (const n of level.terminalNodes) out.add(n.index);
  for (const n of level.keycardNodes) out.add(n.index);
  for (const n of level.objectiveTerminalNodes ?? []) out.add(n.index);
  for (const n of level.signalSourceNodes ?? []) out.add(n.index);
  for (const n of level.signalTargetNodes ?? []) out.add(n.index);
  for (const n of level.stoneTileNodes ?? []) out.add(n.index);

  return out;
}

/**
 * Resolve seeded random firewall placement into concrete `firewallNodes`.
 *
 * Rules:
 * - Only runs when `level.firewallSpawn` is set AND `level.firewallNodes` is empty.
 * - Deterministic: same `seed` => same placement.
 * - Policy `noTriples8`: firewall adjacency graph over 8-neighborhood has max degree 1
 *   (so you can get isolated singles + isolated pairs, but never clusters of 3+).
 */
export function resolveRandomFirewalls(level: LevelDefinition, seed: number): LevelDefinition {
  const spawn = level.firewallSpawn;
  if (!spawn) return level;
  if (level.firewallNodes.length > 0) return level;

  const width = level.width;
  const height = level.height;
  const size = width * height;

  const count = Math.max(0, Math.floor(spawn.count));
  if (count === 0) return level;

  const hp = Math.max(1, Math.floor(spawn.hp));
  const policy = spawn.policy ?? 'noTriples8';
  const avoidBorder = spawn.avoidBorder === true;

  if (policy !== 'noTriples8') {
    throw new Error(`resolveRandomFirewalls: unsupported policy '${policy}'`);
  }

  const occupied = collectOccupied(level);

  const candidates: number[] = [];
  for (let i = 0; i < size; i++) {
    if (occupied.has(i)) continue;
    if (avoidBorder && isBorderIndex(i, width, height)) continue;
    candidates.push(i);
  }

  const rngSeed = deriveSeed(seed, 1000 + (level.id | 0));
  const rng0 = initRngState(rngSeed);

  const placed = placeNoTriples8(candidates, width, height, count, rng0);

  const nodes: FirewallNodeDef[] = placed.indices.map((index) => ({ index, hp }));

  const nextBlocked = uniqueAppend(level.blockedIndices, placed.indices);

  return {
    ...level,
    blockedIndices: nextBlocked,
    firewallNodes: nodes,
  };
}
