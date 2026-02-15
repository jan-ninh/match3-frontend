// src/features/grid/ui/itemeffects/BombExplosionFxLayer.tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';

import { GAP, TILE_SIZE } from '../../lib/constants';
import { cellPixelXY } from '../../lib/math';

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

// Deterministic RNG (no Math.random) → stable sparks per burst id
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

type Spark = Readonly<{
  key: string;
  angleRad: number;
  distPx: number;
  delayS: number;
  lifeS: number;
  thickness: number;
  length: number;
  startScale: number;
  endScale: number;
  spinDeg: number;
}>;

function buildSparks(seed: number, rm: boolean): readonly Spark[] {
  const rand = mulberry32(seed);
  const count = rm ? 10 : 22;

  const sparks: Spark[] = [];
  for (let i = 0; i < count; i++) {
    const a = (rand() * 2 - 1) * Math.PI;
    const a2 = a + (rand() - 0.5) * 0.35;

    const dist = (rm ? 44 : 96) + rand() * (rm ? 46 : 120);
    const delay = rand() * (rm ? 0.03 : 0.08);
    const life = (rm ? 0.18 : 0.42) + rand() * (rm ? 0.12 : 0.18);

    const thickness = 1 + rand() * (rm ? 1 : 1.6);
    const length = (rm ? 8 : 12) + rand() * (rm ? 10 : 18);

    const startScale = 0.9 + rand() * 0.25;
    const endScale = 0.2 + rand() * 0.22;

    const spin = (rand() * 2 - 1) * (rm ? 40 : 120);

    sparks.push({
      key: `s${i}`,
      angleRad: a2,
      distPx: dist,
      delayS: delay,
      lifeS: life,
      thickness,
      length,
      startScale,
      endScale,
      spinDeg: spin,
    });
  }

  return sparks;
}

function seedFromBurstId(id: number): number {
  // mix (deterministic)
  return ((id * 2654435761) ^ 0x9e3779b9) >>> 0;
}

export function BombExplosionFxLayer({ bursts, width, zIndex = 88, reducedMotionHint }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const rm = !!reducedMotionHint || prefersReducedMotion;

  // IMPORTANT: Hook must be called unconditionally (even if bursts is empty)
  const sparksById = useMemo(() => {
    const m = new Map<number, readonly Spark[]>();
    for (const b of bursts) {
      m.set(b.id, buildSparks(seedFromBurstId(b.id), rm));
    }
    return m;
  }, [bursts, rm]);

  if (bursts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex }}>
      <AnimatePresence>
        {bursts.map((b) => {
          const bb = boundsFromIndices(b.indices, width);
          if (!bb) return null;

          const rect = boundsPixelRect(bb);

          const shellStyle: CSSProperties = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            transformOrigin: '50% 50%',
            borderRadius: 0,
            overflow: 'visible',
          };

          const dur = rm ? 0.32 : 0.75;

          const cx = rect.width * 0.5;
          const cy = rect.height * 0.5;

          const sparks = sparksById.get(b.id) ?? buildSparks(seedFromBurstId(b.id), rm);

          return (
            <motion.div
              key={b.id}
              className="absolute"
              style={shellStyle}
              initial={{ opacity: 0, scale: rm ? 1 : 0.94 }}
              animate={{
                opacity: [0, 1, 0],
                scale: rm ? [1, 1, 1] : [0.94, 1.06, 1.12],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur, ease: 'easeOut', times: [0, 0.22, 1] }}
            >
              {/* FIREBALL (core) */}
              <motion.div
                className="absolute"
                style={{
                  left: cx,
                  top: cy,
                  width: rm ? 120 : 210,
                  height: rm ? 120 : 210,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  filter: rm ? 'blur(0px)' : 'blur(0.2px)',
                  mixBlendMode: 'screen',
                  background:
                    'radial-gradient(circle at 40% 35%, rgba(255,214,102,0.95) 0%, rgba(255,122,46,0.78) 24%, rgba(239,68,68,0.58) 46%, rgba(0,0,0,0) 72%)',
                  boxShadow: '0 0 22px rgba(255,122,46,0.35), 0 0 52px rgba(239,68,68,0.22), 0 0 120px rgba(239,68,68,0.12)',
                }}
                initial={{ opacity: 0, scale: rm ? 0.85 : 0.55, rotate: 0 }}
                animate={{
                  opacity: rm ? [0, 0.95, 0] : [0, 1, 0],
                  scale: rm ? [0.85, 1.05, 1.25] : [0.55, 1.1, 1.55],
                  rotate: rm ? [0, 0, 0] : [0, 6, 0],
                }}
                transition={{ duration: dur, ease: 'easeOut', times: [0, 0.18, 1] }}
              />

              {/* FLAME LICKS */}
              <motion.div
                className="absolute"
                style={{
                  left: cx,
                  top: cy,
                  width: rm ? 150 : 250,
                  height: rm ? 150 : 250,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  mixBlendMode: 'screen',
                  filter: rm ? 'blur(1px)' : 'blur(2.4px)',
                  background:
                    'conic-gradient(from 210deg, rgba(255,214,102,0.0) 0deg, rgba(255,214,102,0.35) 45deg, rgba(255,122,46,0.45) 95deg, rgba(239,68,68,0.0) 165deg, rgba(255,122,46,0.36) 240deg, rgba(255,214,102,0.22) 300deg, rgba(0,0,0,0) 360deg)',
                }}
                initial={{ opacity: 0, scale: rm ? 0.92 : 0.68, rotate: -18 }}
                animate={{
                  opacity: rm ? [0, 0.55, 0] : [0, 0.65, 0],
                  scale: rm ? [0.92, 1.08, 1.32] : [0.68, 1.18, 1.58],
                  rotate: rm ? [-18, -10, -6] : [-18, 18, 38],
                }}
                transition={{ duration: dur, ease: 'easeOut', times: [0, 0.22, 1] }}
              />

              {/* SHOCKWAVE RING */}
              <motion.div
                className="absolute"
                style={{
                  left: cx,
                  top: cy,
                  width: rm ? 130 : 220,
                  height: rm ? 130 : 220,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  border: '2px solid rgba(248,113,113,0.55)',
                  boxShadow: '0 0 12px rgba(239,68,68,0.45), 0 0 30px rgba(239,68,68,0.2)',
                }}
                initial={{ opacity: 0, scale: rm ? 0.9 : 0.55 }}
                animate={{
                  opacity: rm ? [0, 0.75, 0] : [0, 0.9, 0],
                  scale: rm ? [0.9, 1.08, 1.28] : [0.55, 1.15, 1.65],
                }}
                transition={{ duration: dur, ease: 'easeOut', times: [0, 0.14, 1] }}
              />

              {/* SMOKE PUFF */}
              <motion.div
                className="absolute"
                style={{
                  left: cx,
                  top: cy,
                  width: rm ? 180 : 300,
                  height: rm ? 180 : 300,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  filter: rm ? 'blur(2px)' : 'blur(6px)',
                  background: 'radial-gradient(circle at 50% 50%, rgba(30,30,30,0.28) 0%, rgba(20,20,20,0.18) 32%, rgba(0,0,0,0.0) 70%)',
                }}
                initial={{ opacity: 0, scale: rm ? 0.92 : 0.7 }}
                animate={{
                  opacity: rm ? [0, 0.26, 0] : [0, 0.32, 0],
                  scale: rm ? [0.92, 1.06, 1.22] : [0.7, 1.15, 1.55],
                }}
                transition={{ duration: dur, ease: 'easeOut', times: [0, 0.25, 1] }}
              />

              {/* SPARKS */}
              {sparks.map((s) => {
                const dx = Math.cos(s.angleRad) * s.distPx;
                const dy = Math.sin(s.angleRad) * s.distPx;

                const sparkStyle: CSSProperties = {
                  left: cx,
                  top: cy,
                  width: s.length,
                  height: s.thickness,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  background:
                    'linear-gradient(90deg, rgba(255,214,102,0.0) 0%, rgba(255,214,102,0.95) 22%, rgba(255,122,46,0.78) 62%, rgba(239,68,68,0.0) 100%)',
                  boxShadow: '0 0 10px rgba(255,122,46,0.22), 0 0 22px rgba(239,68,68,0.12)',
                  mixBlendMode: 'screen',
                };

                const baseRot = (s.angleRad * 180) / Math.PI;

                return (
                  <motion.div
                    key={`${b.id}-${s.key}`}
                    className="absolute"
                    style={sparkStyle}
                    initial={{
                      opacity: 0,
                      x: 0,
                      y: 0,
                      rotate: baseRot,
                      scale: s.startScale,
                    }}
                    animate={{
                      opacity: rm ? [0, 0.9, 0] : [0, 1, 0],
                      x: [0, dx],
                      y: [0, dy],
                      rotate: rm ? [baseRot, baseRot + s.spinDeg * 0.3] : [baseRot, baseRot + s.spinDeg],
                      scale: [s.startScale, s.endScale],
                    }}
                    transition={{
                      delay: s.delayS,
                      duration: rm ? 0.18 : s.lifeS,
                      ease: 'easeOut',
                      times: [0, 0.25, 1],
                    }}
                  />
                );
              })}

              {/* PER-CELL FLASH */}
              {b.indices.map((idx) => {
                const p = cellPixelXY(idx, width);

                const cellStyle: CSSProperties = {
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  borderRadius: 0,
                };

                return (
                  <motion.div
                    key={`cell-${b.id}-${idx}`}
                    className="absolute"
                    style={cellStyle}
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{
                      opacity: rm ? [0, 0.55, 0] : [0, 0.75, 0],
                      scale: rm ? [1, 1, 1] : [1, 1.05, 1],
                    }}
                    transition={{ duration: dur, ease: 'easeOut', times: [0, 0.18, 1] }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(120% 120% at 50% 50%, rgba(255,214,102,0.18) 0%, rgba(255,122,46,0.14) 34%, rgba(239,68,68,0.10) 54%, rgba(0,0,0,0) 78%)',
                        outline: '1px solid rgba(248,113,113,0.22)',
                        boxShadow: '0 0 10px rgba(239,68,68,0.16)',
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
