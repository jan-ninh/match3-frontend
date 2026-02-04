export type Rng = {
  readonly seed: number;
  nextFloat: () => number; // [0, 1)
  nextInt: (maxExclusive: number) => number; // [0, maxExclusive)
};

export function createRng(seed: number): Rng {
  let t = seed >>> 0;

  const nextFloat = () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (maxExclusive: number) => {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
    return Math.floor(nextFloat() * maxExclusive);
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