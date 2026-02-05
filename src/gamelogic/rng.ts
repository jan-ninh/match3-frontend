export type Rng = {
  readonly seed: number;
  nextFloat: () => number; // [0, 1)
  nextInt: (maxExclusive: number) => number; // [0, maxExclusive)
};

// Serializable RNG state (for deterministic replays)
export type RngState = number;

export function initRngState(seed: number): RngState {
  const s = seed >>> 0;
  return (s === 0 ? 1 : s) >>> 0;
}

// mulberry32-like step, but pure (state in/out)
export function rngNextFloat(state: RngState): { state: RngState; value: number } {
  let t = (state + 0x6d2b79f5) >>> 0;
  let x = Math.imul(t ^ (t >>> 15), 1 | t);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  const value = ((x ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: t >>> 0, value };
}

export function rngNextInt(state: RngState, maxExclusive: number): { state: RngState; value: number } {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return { state, value: 0 };
  const r = rngNextFloat(state);
  return { state: r.state, value: Math.floor(r.value * maxExclusive) };
}

export function rngShuffleInPlace<T>(state: RngState, arr: T[]): { state: RngState; arr: T[] } {
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const r = rngNextInt(s, i + 1);
    s = r.state;
    const j = r.value;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return { state: s, arr };
}

// Legacy convenience wrapper (non-serializable)
export function createRng(seed: number): Rng {
  let t = initRngState(seed);

  const nextFloat = () => {
    const r = rngNextFloat(t);
    t = r.state;
    return r.value;
  };

  const nextInt = (maxExclusive: number) => {
    const r = rngNextInt(t, maxExclusive);
    t = r.state;
    return r.value;
  };

  return { seed, nextFloat, nextInt };
}

export function deriveSeed(baseSeed: number, levelId: number): number {
  let x = (baseSeed ^ (levelId * 0x9e3779b9)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return (x === 0 ? 1 : x) >>> 0;
}
