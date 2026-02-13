// src/gamelogic/cascade/cascadeRng.ts

/**
 * Deterministic RNG helper for cascade-side effects.
 * This is intentionally *not* using rngState so side effects are stable under replay,
 * but don't consume the main RNG stream used for refills.
 */
export function rngForCascadeEffect(baseSeed: number, turnIndex: number, effectId: number): number {
  return ((baseSeed * 37) ^ (turnIndex * 19) ^ (effectId * 11)) >>> 0;
}

export function pickDeterministic<T>(items: readonly T[], seed: number): T {
  // Caller guarantees items.length > 0
  return items[seed % items.length]!;
}
