// src/gamelogic/cascade/effects/selection.ts
export function uniqSorted(indices: readonly number[]): number[] {
  if (indices.length === 0) return [];
  const s = new Set<number>();
  for (const i of indices) s.add(i);
  return Array.from(s).sort((a, b) => a - b);
}
