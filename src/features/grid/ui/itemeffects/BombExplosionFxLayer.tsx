// src/features/grid/ui/itemeffects/BombExplosionFxLayer.tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';

import explosionSheetUrl from '@/assets/fx/explosion_flipbook_8x8_256.alpha.png';
import { GAP, TILE_SIZE } from '../../lib/constants';

import type { BombTarget } from '../bomb/typesBomb';
import { FlipbookSprite } from './FlipbookSprite';

export type BombExplosionBurst = Readonly<{
  id: number;
  indices: readonly number[]; // kept for future (and engine parity)
  center: BombTarget;
  createdAtMs: number; // performance.now() timebase
}>;

type Props = {
  bursts: readonly BombExplosionBurst[];
  width: number;
  zIndex?: number;
  reducedMotionHint?: boolean;
};

const SHEET = {
  sheetUrl: explosionSheetUrl,
  cols: 8,
  rows: 8,
  frameW: 256,
  frameH: 256,
  frameCount: 60,
} as const;

function cellStepPx(): number {
  return TILE_SIZE + GAP;
}

export function BombExplosionFxLayer({ bursts, width, zIndex = 88, reducedMotionHint }: Props) {
  // keep arg “used” (ESLint no-unused-vars)
  void width;

  const prefersReducedMotion = useReducedMotion();
  const rm = !!reducedMotionHint || prefersReducedMotion;

  if (bursts.length === 0) return null;

  // Must match the TTL used in useBomb3x3Targeting (UI-only).
  const durS = rm ? 0.22 : 0.65;

  // Finish the 30 frames within the burst TTL.
  const fps = rm ? 140 : 60;

  const step = cellStepPx();
  const size3 = 3 * step - GAP; // 3 tiles + 2 gaps

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex }}>
      <AnimatePresence>
        {bursts.map((b) => {
          const cx = b.center.x * step + TILE_SIZE * 0.5;
          const cy = b.center.y * step + TILE_SIZE * 0.5;

          const shellStyle: CSSProperties = {
            position: 'absolute',
            left: cx,
            top: cy,
            transform: 'translate(-50%, -50%)',
            width: size3,
            height: size3,
            overflow: 'visible',
          };

          return (
            <motion.div
              key={b.id}
              className="absolute"
              style={shellStyle}
              initial={{ opacity: 0, scale: rm ? 1 : 0.96 }}
              animate={{ opacity: [0, 1, 0], scale: rm ? [1, 1, 1] : [0.96, 1.06, 1.12] }}
              exit={{ opacity: 0 }}
              transition={{ duration: durS, ease: 'easeOut', times: [0, 0.18, 1] }}
            >
              {/* Flipbook explosion, centered over 3×3 target (TRUE ALPHA) */}
              <FlipbookSprite
                sheet={SHEET}
                fps={fps}
                loop={false}
                getNowMs={() => performance.now()}
                startAtMs={b.createdAtMs}
                renderW={size3}
                renderH={size3}
                opacity={1}
                ariaLabel="bomb explosion"
              />

              {/* Optional extra hot core flash (subtle) */}
              <motion.div
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  width: '100%',
                  height: '100%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 999,
                  pointerEvents: 'none',
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(255,214,102,0.20) 0%, rgba(255,122,46,0.14) 34%, rgba(239,68,68,0.08) 52%, rgba(0,0,0,0) 74%)',
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0, 0.6, 0], scale: [0.9, 1.05, 1.2] }}
                transition={{ duration: durS, ease: 'easeOut', times: [0, 0.12, 1] }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
