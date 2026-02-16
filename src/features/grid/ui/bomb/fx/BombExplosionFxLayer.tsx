// src/features/grid/ui/bomb/fx/BombExplosionFxLayer.tsx
import type { BombTarget } from '../typesBomb';

import { BombExplosionFxFlipbook } from './BombExplosionFxFlipbook';
import { BombExplosionFxLegacyShock } from './BombExplosionFxLegacyShock';

export type BombVfxMode = 'flipbook' | 'legacyShock';

export type BombExplosionBurst = Readonly<{
  id: number;
  indices: readonly number[]; // kept for future (and engine parity)
  center: BombTarget;
  createdAtMs: number; // performance.now() timebase
}>;

export type BombExplosionFxLayerProps = Readonly<{
  bursts: readonly BombExplosionBurst[];
  width: number;
  zIndex?: number;
  reducedMotionHint?: boolean;

  /**
   * DEV-only: switch between VFX implementations.
   * In production builds this is ignored and "flipbook" is always used.
   */
  mode?: BombVfxMode;
}>;

export function BombExplosionFxLayer({ mode, ...rest }: BombExplosionFxLayerProps) {
  const effectiveMode: BombVfxMode = import.meta.env.DEV ? (mode ?? 'flipbook') : 'flipbook';

  if (effectiveMode === 'legacyShock') {
    return <BombExplosionFxLegacyShock {...rest} />;
  }

  return <BombExplosionFxFlipbook {...rest} />;
}
