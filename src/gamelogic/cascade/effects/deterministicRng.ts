// src/gamelogic/cascade/effects/deterministicRng.ts
export function rngForCascadeEffect(baseSeed: number, turnIndex: number, effectId: number): number {
  return ((baseSeed * 37) ^ (turnIndex * 19) ^ (effectId * 11)) >>> 0;
}

export function pickDeterministic<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length]!;
}
