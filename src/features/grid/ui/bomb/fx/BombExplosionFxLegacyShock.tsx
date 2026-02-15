// src/features/grid/ui/bomb/fx/BombExplosionFxLegacyShock.tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';

import { GAP, TILE_SIZE } from '../../../lib/constants';
import { cellPixelXY } from '../../../lib/math';

import type { BombExplosionFxLayerProps } from './BombExplosionFxLayer';

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

export function BombExplosionFxLegacyShock({ bursts, width, zIndex = 88, reducedMotionHint }: Omit<BombExplosionFxLayerProps, 'mode'>) {
  const prefersReducedMotion = useReducedMotion();
  const rm = !!reducedMotionHint || prefersReducedMotion;

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
            borderRadius: 0, // square corners = more threatening
            willChange: 'transform, opacity',
          };

          // keep field “used” (ESLint no-unused-vars)
          void b.center;

          const dur = rm ? 0.22 : 0.62;

          return (
            <motion.div
              key={b.id}
              className="absolute"
              style={shellStyle}
              initial={{ opacity: 0, scale: rm ? 1 : 0.92 }}
              animate={{
                opacity: rm ? [0, 0.85, 0] : [0, 0.95, 0],
                scale: rm ? [1, 1, 1] : [0.92, 1.07, 1.12],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: dur,
                ease: 'easeOut',
                times: [0, 0.26, 1],
              }}
            >
              {/* Shock wash */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(120% 120% at 50% 50%, rgba(239,68,68,0.34) 0%, rgba(239,68,68,0.16) 34%, rgba(0,0,0,0) 70%)',
                  boxShadow: '0 0 26px rgba(239,68,68,0.22), 0 0 60px rgba(239,68,68,0.14)',
                }}
              />

              {/* Frame */}
              <div
                className="absolute inset-0"
                style={{
                  border: '2px solid rgba(248,113,113,0.52)',
                  boxShadow: '0 0 10px rgba(239,68,68,0.55), 0 0 22px rgba(239,68,68,0.22)',
                }}
              />

              {/* Per-cell flash (tight, crisp) */}
              {b.indices.map((idx) => {
                const pAbs = cellPixelXY(idx, width);

                // IMPORTANT: wrapper is already offset by rect.left/top → make per-cell coords relative
                const relX = pAbs.x - rect.left;
                const relY = pAbs.y - rect.top;

                const cellStyle: CSSProperties = {
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  transform: `translate(${relX}px, ${relY}px)`,
                  borderRadius: 0,
                  willChange: 'opacity',
                };

                return (
                  <motion.div
                    key={`${b.id}-${idx}`}
                    className="absolute"
                    style={cellStyle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: rm ? [0, 0.4, 0] : [0, 0.55, 0] }}
                    transition={{ duration: dur, ease: 'easeOut', times: [0, 0.2, 1] }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.22) 30%, rgba(239,68,68,0.22) 70%, rgba(239,68,68,0.0) 100%)',
                        outline: '1px solid rgba(248,113,113,0.22)',
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
