// src/features/grid/ui/itemeffects/BombExplosionFxLayer.tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';

import { GAP, TILE_SIZE } from '../../lib/constants';

export type BombExplosionBurst = Readonly<{
  id: number;
  indices: readonly number[];
  createdAtMs: number;
}>;

type Props = {
  bursts: readonly BombExplosionBurst[];
  width: number;
  zIndex?: number;
  reducedMotionHint?: boolean;
};

type Bounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

function boundsFromIndices(indices: readonly number[], width: number): Bounds | null {
  if (indices.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const idx of indices) {
    const x = idx % width;
    const y = Math.floor(idx / width);

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;

  return { minX, minY, maxX, maxY };
}

function cellStepPx(): number {
  return TILE_SIZE + GAP;
}

function boundsPixelRect(b: Bounds) {
  const step = cellStepPx();
  return {
    left: b.minX * step,
    top: b.minY * step,
    width: (b.maxX - b.minX + 1) * step - GAP,
    height: (b.maxY - b.minY + 1) * step - GAP,
  };
}

/** Deterministic tiny PRNG (stable per burst.id). */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(n: number): number {
  // simple 32-bit mix
  let x = n >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function pickBetween(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

type Pt = Readonly<{ x: number; y: number }>;

type FlameParticle = Readonly<{
  key: string;
  x: number;
  y: number;
  size: number;
  rotDeg: number;
  skewDeg: number;
  delay: number;
  stretch: number;
}>;

type SmokeParticle = Readonly<{
  key: string;
  x: number;
  y: number;
  size: number;
  rotDeg: number;
  delay: number;
  driftX: number;
}>;

type SparkParticle = Readonly<{
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotDeg: number;
  dx: number;
  dy: number;
  delay: number;
  dur: number;
}>;

type BurstRenderData = Readonly<{
  expandedLeft: number;
  expandedTop: number;
  expandedW: number;
  expandedH: number;
  center: Pt;
  impactPoints: readonly Pt[];
  flames: readonly FlameParticle[];
  smoke: readonly SmokeParticle[];
  sparks: readonly SparkParticle[];
  durTotal: number;
  durFlash: number;
}>;

function buildBurstData(burst: BombExplosionBurst, width: number, rm: boolean): BurstRenderData | null {
  const bb = boundsFromIndices(burst.indices, width);
  if (!bb) return null;

  const base = boundsPixelRect(bb);
  const step = cellStepPx();

  // Expand so flames/smoke can spill out of the 3×3 area (cinematic).
  const margin = rm ? step * 0.18 : step * 0.75;

  const expandedLeft = base.left - margin;
  const expandedTop = base.top - margin;
  const expandedW = base.width + margin * 2;
  const expandedH = base.height + margin * 2;

  const center: Pt = { x: expandedW * 0.5, y: expandedH * 0.5 };

  const impactPoints: Pt[] = burst.indices.map((idx) => {
    const xCell = (idx % width) * step;
    const yCell = Math.floor(idx / width) * step;

    // local center of the impacted cell within the expanded rect
    return {
      x: xCell - expandedLeft + TILE_SIZE * 0.5,
      y: yCell - expandedTop + TILE_SIZE * 0.5,
    };
  });

  const rng = mulberry32(hashSeed(burst.id ^ (burst.indices.length << 8)));

  const durTotal = rm ? 0.24 : 0.96;
  const durFlash = rm ? 0.18 : 0.24;

  if (rm) {
    return {
      expandedLeft,
      expandedTop,
      expandedW,
      expandedH,
      center,
      impactPoints,
      flames: [],
      smoke: [],
      sparks: [],
      durTotal,
      durFlash,
    };
  }

  const pickImpact = (): Pt => {
    if (impactPoints.length === 0) return center;
    const i = Math.floor(rng() * impactPoints.length);
    return impactPoints[i] ?? center;
  };

  const flameCount = 10;
  const smokeCount = 8;
  const sparkCount = 22;

  const flames: FlameParticle[] = Array.from({ length: flameCount }, (_, i) => {
    const src = pickImpact();
    const ang = pickBetween(rng, -Math.PI, Math.PI);
    const rad = pickBetween(rng, step * 0.1, step * 0.55);
    const x = src.x + Math.cos(ang) * rad;
    const y = src.y + Math.sin(ang) * rad;

    const size = pickBetween(rng, step * 0.95, step * 1.7);
    const rotDeg = pickBetween(rng, -140, 140);
    const skewDeg = pickBetween(rng, -14, 14);
    const delay = pickBetween(rng, 0.0, 0.055);
    const stretch = pickBetween(rng, 1.05, 1.55);

    return { key: `flame-${i}`, x, y, size, rotDeg, skewDeg, delay, stretch };
  });

  const smoke: SmokeParticle[] = Array.from({ length: smokeCount }, (_, i) => {
    const src = pickImpact();
    const x = src.x + pickBetween(rng, -step * 0.18, step * 0.18);
    const y = src.y + pickBetween(rng, -step * 0.1, step * 0.2);

    const size = pickBetween(rng, step * 1.35, step * 2.35);
    const rotDeg = pickBetween(rng, -120, 120);
    const delay = pickBetween(rng, 0.08, 0.22);
    const driftX = pickBetween(rng, -step * 0.35, step * 0.35);

    return { key: `smoke-${i}`, x, y, size, rotDeg, delay, driftX };
  });

  const sparks: SparkParticle[] = Array.from({ length: sparkCount }, (_, i) => {
    const src = pickImpact();

    const ang = pickBetween(rng, 0, Math.PI * 2);
    const dist = pickBetween(rng, step * 1.1, step * 2.9);

    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - pickBetween(rng, step * 0.25, step * 0.85); // bias upward

    const w = pickBetween(rng, 1.2, 2.4);
    const h = pickBetween(rng, 8, 18);
    const rotDeg = (ang * 180) / Math.PI + 90;
    const delay = pickBetween(rng, 0.01, 0.09);
    const dur = pickBetween(rng, 0.28, 0.58);

    return { key: `spark-${i}`, x: src.x, y: src.y, w, h, rotDeg, dx, dy, delay, dur };
  });

  return {
    expandedLeft,
    expandedTop,
    expandedW,
    expandedH,
    center,
    impactPoints,
    flames,
    smoke,
    sparks,
    durTotal,
    durFlash,
  };
}

type BurstFxProps = Readonly<{
  burst: BombExplosionBurst;
  width: number;
  rm: boolean;
}>;

function BurstFx({ burst, width, rm }: BurstFxProps) {
  const data = buildBurstData(burst, width, rm);
  if (!data) return null;

  const shellStyle: CSSProperties = {
    left: data.expandedLeft,
    top: data.expandedTop,
    width: data.expandedW,
    height: data.expandedH,
    transformOrigin: '50% 50%',
    borderRadius: 0, // square corners = more threatening
    overflow: 'visible',
  };

  // The "big beat": slight camera punch + fade.
  const punchScale = rm ? [1, 1] : [0.92, 1.08, 1.12];
  const punchOpacity = rm ? [0, 0.75, 0] : [0, 0.98, 0];
  const punchTimes = rm ? [0, 0.22, 1] : [0, 0.12, 1];

  return (
    <motion.div
      key={burst.id}
      className="absolute pointer-events-none"
      style={shellStyle}
      initial={{ opacity: 0, scale: rm ? 1 : 0.92 }}
      animate={{ opacity: punchOpacity, scale: punchScale, rotate: rm ? 0 : [0, -0.6, 0.35, 0] }}
      exit={{ opacity: 0 }}
      transition={{
        duration: data.durTotal,
        ease: 'easeOut',
        times: punchTimes,
      }}
    >
      {/* Core flash (white-hot) */}
      <motion.div
        className="absolute"
        style={{
          left: data.center.x,
          top: data.center.y,
          width: Math.max(data.expandedW, data.expandedH) * 1.15,
          height: Math.max(data.expandedW, data.expandedH) * 1.15,
          transform: 'translate(-50%, -50%)',
          borderRadius: 9999,
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.95) 0%, rgba(255,220,170,0.88) 18%, rgba(255,128,64,0.62) 44%, rgba(0,0,0,0) 72%)',
          filter: rm ? 'none' : 'blur(0.6px)',
          mixBlendMode: 'screen',
          willChange: 'transform, opacity, filter',
        }}
        initial={{ opacity: 0, scale: rm ? 1 : 0.55 }}
        animate={{ opacity: rm ? [0, 0.55, 0] : [0, 0.92, 0], scale: rm ? [1, 1, 1] : [0.55, 1.15, 1.45] }}
        transition={{ duration: data.durFlash, ease: 'easeOut', times: [0, 0.15, 1] }}
      />

      {/* Shockwave ring */}
      <motion.div
        className="absolute"
        style={{
          left: data.center.x,
          top: data.center.y,
          width: Math.max(data.expandedW, data.expandedH) * 0.4,
          height: Math.max(data.expandedW, data.expandedH) * 0.4,
          transform: 'translate(-50%, -50%)',
          borderRadius: 9999,
          border: '2px solid rgba(255,160,96,0.38)',
          boxShadow: '0 0 18px rgba(255,120,60,0.22), 0 0 44px rgba(255,80,40,0.14)',
          mixBlendMode: 'screen',
          willChange: 'transform, opacity',
        }}
        initial={{ opacity: 0, scale: 0.25 }}
        animate={{ opacity: [0, 0.6, 0], scale: [0.25, 1.8, 2.35] }}
        transition={{ duration: rm ? 0.22 : 0.58, ease: 'easeOut', times: [0, 0.12, 1] }}
      />

      {/* Heat wash (red/orange bloom) */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(120% 120% at 50% 55%, rgba(255,90,40,0.20) 0%, rgba(255,40,30,0.12) 28%, rgba(0,0,0,0) 68%)',
          boxShadow: '0 0 38px rgba(255,70,40,0.18), 0 0 86px rgba(255,40,30,0.08)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Flames (asymmetric, organic blobs) */}
      {data.flames.map((p) => {
        const size = p.size;
        const flameStyle: CSSProperties = {
          left: p.x,
          top: p.y,
          width: size,
          height: size,
          transform: `translate(-50%, -55%) rotate(${p.rotDeg}deg) skew(${p.skewDeg}deg)`,
          borderRadius: '60% 40% 55% 45% / 55% 45% 65% 35%',
          background:
            'radial-gradient(55% 70% at 52% 28%, rgba(255,255,255,0.80) 0%, rgba(255,210,150,0.85) 18%, rgba(255,130,60,0.72) 42%, rgba(180,35,10,0.35) 62%, rgba(0,0,0,0) 78%)',
          filter: 'blur(0.4px)',
          mixBlendMode: 'screen',
          willChange: 'transform, opacity, filter',
        };

        return (
          <motion.div
            key={p.key}
            className="absolute"
            style={flameStyle}
            initial={{ opacity: 0, scale: 0.35 }}
            animate={{
              opacity: [0, 0.92, 0],
              scale: [0.35, 1.0 * p.stretch, 1.25 * p.stretch],
              y: [0, -14, -28],
              rotate: [0, pickBetween(mulberry32(hashSeed(burst.id ^ (size | 0))), -8, 8), 0],
            }}
            transition={{ duration: 0.62, ease: 'easeOut', delay: p.delay, times: [0, 0.2, 1] }}
          />
        );
      })}

      {/* Sparks / embers */}
      {data.sparks.map((s) => {
        const sparkStyle: CSSProperties = {
          left: s.x,
          top: s.y,
          width: s.w,
          height: s.h,
          transform: `translate(-50%, -50%) rotate(${s.rotDeg}deg)`,
          borderRadius: 9999,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,210,120,0.92) 22%, rgba(255,120,40,0.68) 55%, rgba(0,0,0,0) 100%)',
          boxShadow: '0 0 10px rgba(255,160,80,0.26)',
          mixBlendMode: 'screen',
          willChange: 'transform, opacity',
        };

        return (
          <motion.div
            key={s.key}
            className="absolute"
            style={sparkStyle}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 0],
              x: [0, s.dx],
              y: [0, s.dy],
              scale: [0.6, 1.0, 0.2],
            }}
            transition={{ duration: s.dur, ease: 'easeOut', delay: s.delay, times: [0, 0.12, 1] }}
          />
        );
      })}

      {/* Black smoke (lingers, rises, multiplies over flames) */}
      {data.smoke.map((p) => {
        const size = p.size;
        const smokeStyle: CSSProperties = {
          left: p.x,
          top: p.y,
          width: size,
          height: size,
          transform: `translate(-50%, -50%) rotate(${p.rotDeg}deg)`,
          borderRadius: '55% 45% 55% 45% / 50% 55% 45% 50%',
          background: 'radial-gradient(60% 60% at 46% 44%, rgba(12,12,12,0.62) 0%, rgba(0,0,0,0.44) 38%, rgba(0,0,0,0.22) 56%, rgba(0,0,0,0) 76%)',
          filter: 'blur(9px)',
          mixBlendMode: 'multiply',
          willChange: 'transform, opacity, filter',
        };

        return (
          <motion.div
            key={p.key}
            className="absolute"
            style={smokeStyle}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0.55, 1.05, 1.45],
              x: [0, p.driftX],
              y: [0, -26, -74],
              rotate: [0, pickBetween(mulberry32(hashSeed(burst.id ^ (size | 0))), -10, 10), 0],
            }}
            transition={{ duration: 0.98, ease: 'easeOut', delay: p.delay, times: [0, 0.35, 1] }}
          />
        );
      })}

      {/* Per-cell crisp flash (keeps it readable on-grid) */}
      {burst.indices.map((idx) => {
        const step = cellStepPx();
        const xCell = (idx % width) * step;
        const yCell = Math.floor(idx / width) * step;

        const localX = xCell - data.expandedLeft;
        const localY = yCell - data.expandedTop;

        const cellStyle: CSSProperties = {
          width: TILE_SIZE,
          height: TILE_SIZE,
          transform: `translate(${localX}px, ${localY}px)`,
          borderRadius: 0,
          willChange: 'transform, opacity',
        };

        return (
          <motion.div
            key={idx}
            className="absolute"
            style={cellStyle}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: rm ? [0, 0.4, 0] : [0, 0.62, 0],
              scale: rm ? [1, 1, 1] : [0.92, 1.08, 1.02],
            }}
            transition={{ duration: rm ? 0.2 : 0.48, ease: 'easeOut', times: [0, 0.16, 1] }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,120,60,0.22) 28%, rgba(255,80,40,0.18) 70%, rgba(0,0,0,0.0) 100%)',
                outline: '1px solid rgba(255,160,110,0.18)',
                mixBlendMode: 'screen',
              }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function BombExplosionFxLayer({ bursts, width, zIndex = 88, reducedMotionHint }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const rm = !!reducedMotionHint || prefersReducedMotion;

  if (bursts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex }}>
      <AnimatePresence>
        {bursts.map((b) => (
          <BurstFx key={b.id} burst={b} width={width} rm={rm} />
        ))}
      </AnimatePresence>
    </div>
  );
}
