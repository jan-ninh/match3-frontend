// src/features/grid/ui/fx/tilePop/TilePopFxLayer.tsx
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Piece, PieceId, PieceType } from '@/gamelogic';
import { cellPixelXY } from '../../../lib/math';
import { TILE_SIZE } from '../../../lib/constants';
import Tile from '../../Tile';

export type TilePopVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

type Burst = Readonly<{
  id: number;
  cellIndex: number;
  type: PieceType;
  createdAtMs: number; // performance.now() timebase
}>;

export type TilePopFxLayerProps = Readonly<{
  pieces: readonly Piece[];
  width: number;
  zIndex?: number;
  reducedMotionHint?: boolean;

  /**
   * 1..20
   * - 1..10  subtle (existing)
   * - 11..20 strong (new)
   */
  variant?: TilePopVariant;
}>;

function defaultNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function clampVariant(v: number): TilePopVariant {
  if (!Number.isFinite(v)) return 1;
  const x = v | 0;
  if (x <= 1) return 1;
  if (x === 2) return 2;
  if (x === 3) return 3;
  if (x === 4) return 4;
  if (x === 5) return 5;
  if (x === 6) return 6;
  if (x === 7) return 7;
  if (x === 8) return 8;
  if (x === 9) return 9;
  if (x === 10) return 10;
  if (x === 11) return 11;
  if (x === 12) return 12;
  if (x === 13) return 13;
  if (x === 14) return 14;
  if (x === 15) return 15;
  if (x === 16) return 16;
  if (x === 17) return 17;
  if (x === 18) return 18;
  if (x === 19) return 19;
  return 20;
}

function getLifeMs(variant: TilePopVariant, reducedMotionHint: boolean): number {
  if (reducedMotionHint) return 120;

  switch (variant) {
    // 1..10 (unchanged)
    case 1:
      return 220;
    case 2:
      return 260;
    case 3:
      return 320;
    case 4:
      return 280;
    case 5:
      return 300;
    case 6:
      return 300;
    case 7:
      return 340;
    case 8:
      return 360;
    case 9:
      return 280;
    case 10:
      return 420;

    // 11..20 (stronger)
    case 11:
      return 380;
    case 12:
      return 420;
    case 13:
      return 420;
    case 14:
      return 520;
    case 15:
      return 440;
    case 16:
      return 420;
    case 17:
      return 460;
    case 18:
      return 420;
    case 19:
      return 560;
    case 20:
      return 520;
  }
}

function safeAnimate(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  if (typeof el.animate !== 'function') return;
  try {
    el.animate(keyframes, options);
  } catch {
    // no-op: older browser or invalid keyframes; effect stays static but harmless
  }
}

type MiniParticleKind = 'dot' | 'pixel' | 'tri';

type MiniParticleSpec = Readonly<{
  kind: MiniParticleKind;
  deg: number;
  dist: number;
  size: number;
  delay: number;
}>;

function makeRadial(n: number, dist: number, size: number, delayStep: number, offsetDeg = 0): readonly MiniParticleSpec[] {
  const out: MiniParticleSpec[] = [];
  const step = 360 / n;
  for (let i = 0; i < n; i++) {
    out.push({
      kind: 'dot',
      deg: offsetDeg + i * step,
      dist,
      size,
      delay: i * delayStep,
    });
  }
  return out;
}

function makePixels(n: number, dist: number, size: number, delayStep: number, offsetDeg = 0): readonly MiniParticleSpec[] {
  const out: MiniParticleSpec[] = [];
  const step = 360 / n;
  for (let i = 0; i < n; i++) {
    out.push({
      kind: 'pixel',
      deg: offsetDeg + i * step,
      dist,
      size,
      delay: i * delayStep,
    });
  }
  return out;
}

function makeTris(n: number, dist: number, size: number, delayStep: number, offsetDeg = 0): readonly MiniParticleSpec[] {
  const out: MiniParticleSpec[] = [];
  const step = 360 / n;
  for (let i = 0; i < n; i++) {
    out.push({
      kind: 'tri',
      deg: offsetDeg + i * step,
      dist,
      size,
      delay: i * delayStep,
    });
  }
  return out;
}

/**
 * TilePopFxLayer
 * - UI-only: detects removed Pieces by diffing prev→next `pieces[]`.
 * - Spawns a short-lived VFX burst at the last known cellIndex.
 *
 * Variants:
 * 1..10  subtle (existing)
 * 11) Big ring + flash + 8 rays
 * 12) Electric burst (12 rays + jitter flash)
 * 13) Shards (triangles fly out)
 * 14) Plasma swirl (conic) + ring
 * 15) Pixel confetti burst (12 squares)
 * 16) Starburst (long rays + double ring)
 * 17) Afterimage triple-ghost + ring
 * 18) “Glitch pop” (scanlines + strong flash)
 * 19) Smoke puff (big blurred radial)
 * 20) Portal pop (thick ring + inner pulse)
 */
export function TilePopFxLayer({ pieces, width, zIndex = 82, reducedMotionHint = false, variant = 1 }: TilePopFxLayerProps) {
  const v = clampVariant(variant);

  const nowFn = useMemo(() => defaultNowMs, []);
  const prevRef = useRef<Map<PieceId, Readonly<{ cellIndex: number; type: PieceType }>>>(new Map());
  const nextIdRef = useRef<number>(1);

  const [bursts, setBursts] = useState<readonly Burst[]>([]);

  useEffect(() => {
    const nextMap = new Map<PieceId, Readonly<{ cellIndex: number; type: PieceType }>>();
    for (const p of pieces) nextMap.set(p.id, { cellIndex: p.cellIndex, type: p.type });

    const prevMap = prevRef.current;
    prevRef.current = nextMap;

    if (prevMap.size === 0) return;

    const removed: Array<Readonly<{ cellIndex: number; type: PieceType }>> = [];
    for (const [id, prev] of prevMap) {
      if (!nextMap.has(id)) removed.push(prev);
    }

    if (removed.length > 24) return;
    if (removed.length === 0) return;

    const t = nowFn();
    const newBursts: Burst[] = removed.map((r) => ({
      id: nextIdRef.current++,
      cellIndex: r.cellIndex,
      type: r.type,
      createdAtMs: t,
    }));

    setBursts((prev) => [...prev, ...newBursts]);
  }, [pieces, nowFn]);

  const onDone = (id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex }}>
      {bursts.map((b) => (
        <TilePopBurstView key={b.id} burst={b} width={width} variant={v} reducedMotionHint={reducedMotionHint} onDone={onDone} />
      ))}
    </div>
  );
}

function TilePopBurstView({
  burst,
  width,
  variant,
  reducedMotionHint,
  onDone,
}: Readonly<{
  burst: Burst;
  width: number;
  variant: TilePopVariant;
  reducedMotionHint: boolean;
  onDone: (id: number) => void;
}>) {
  const lifeMs = getLifeMs(variant, reducedMotionHint);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghost2Ref = useRef<HTMLDivElement | null>(null);
  const ghost3Ref = useRef<HTMLDivElement | null>(null);

  const glowRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);

  const ringARef = useRef<HTMLDivElement | null>(null);
  const ringBRef = useRef<HTMLDivElement | null>(null);
  const ringCRef = useRef<HTMLDivElement | null>(null);

  const swirlRef = useRef<HTMLDivElement | null>(null);

  const scanHRef = useRef<HTMLDivElement | null>(null);
  const scanVRef = useRef<HTMLDivElement | null>(null);

  const sparkRefs = useRef<Array<HTMLDivElement | null>>([]);
  const particleRefs = useRef<Array<HTMLDivElement | null>>([]);

  const pos = cellPixelXY(burst.cellIndex, width);

  const sparkAngles = useMemo(() => {
    // 1..10 (unchanged)
    if (variant === 5) return [0, 90, 180, 270];
    if (variant === 6) return [45, 135, 225, 315];
    if (variant === 4) return [20, 110, 200, 290];
    if (variant === 7) return [0, 60, 120, 180, 240, 300];

    // 11..20 (strong)
    if (variant === 11) return [0, 45, 90, 135, 180, 225, 270, 315];
    if (variant === 12) return [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    if (variant === 16) return [0, 45, 90, 135, 180, 225, 270, 315];

    return [];
  }, [variant]);

  const particles = useMemo<readonly MiniParticleSpec[]>(() => {
    if (variant === 7) return makeRadial(6, 18, 4, 0, 0);
    if (variant === 10) return makeRadial(8, 22, 4, 0, 0);

    if (variant === 13) return makeTris(10, 26, 10, 6, 10);
    if (variant === 15) return makePixels(12, 26, 6, 4, 15);

    return [];
  }, [variant]);

  const isShardClassic = variant === 4;

  const strong = variant >= 11;

  const sparkThickness = isShardClassic ? 3 : strong ? 3 : 2;
  const sparkLen = isShardClassic ? 12 : variant === 16 ? 26 : strong ? 18 : 14;
  const sparkOpacity = isShardClassic ? 0.5 : strong ? 0.7 : 0.38;

  useEffect(() => {
    if (reducedMotionHint) {
      const ghost = ghostRef.current;
      const glow = glowRef.current;
      if (ghost) safeAnimate(ghost, [{ opacity: 0.7 }, { opacity: 0 }], { duration: lifeMs, easing: 'linear', fill: 'forwards' });
      if (glow) safeAnimate(glow, [{ opacity: 0.25 }, { opacity: 0 }], { duration: lifeMs, easing: 'linear', fill: 'forwards' });

      const t = window.setTimeout(() => onDone(burst.id), lifeMs + 20);
      return () => window.clearTimeout(t);
    }

    const ghost = ghostRef.current;
    const ghost2 = ghost2Ref.current;
    const ghost3 = ghost3Ref.current;

    const glow = glowRef.current;
    const flash = flashRef.current;

    const ringA = ringARef.current;
    const ringB = ringBRef.current;
    const ringC = ringCRef.current;

    const swirl = swirlRef.current;

    const scanH = scanHRef.current;
    const scanV = scanVRef.current;

    // Base: ghost fade (subtle baseline; unchanged for 1..10)
    if (ghost) {
      safeAnimate(
        ghost,
        [
          { transform: 'scale(1)', opacity: 0.92, filter: 'brightness(1)' },
          { transform: strong ? 'scale(1.12)' : 'scale(1.06)', opacity: strong ? 0.78 : 0.72, filter: strong ? 'brightness(1.22)' : 'brightness(1.12)' },
          { transform: strong ? 'scale(0.86)' : 'scale(0.92)', opacity: 0, filter: 'brightness(1.0)' },
        ],
        { duration: Math.min(lifeMs, strong ? 320 : 260), easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)', fill: 'forwards' },
      );
    }

    // Base: glow
    if (glow) {
      safeAnimate(
        glow,
        [
          { transform: 'scale(0.55)', opacity: 0.0, filter: 'blur(4px)' },
          { transform: strong ? 'scale(1.25)' : 'scale(1.1)', opacity: strong ? 0.55 : 0.22, filter: strong ? 'blur(10px)' : 'blur(8px)' },
          { transform: strong ? 'scale(1.55)' : 'scale(1.25)', opacity: 0.0, filter: strong ? 'blur(14px)' : 'blur(10px)' },
        ],
        { duration: Math.min(lifeMs, strong ? 420 : 320), easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
      );
    }

    // Strong: flash overlay
    if (strong && flash) {
      safeAnimate(
        flash,
        [
          { opacity: 0.0, transform: 'scale(0.9)' },
          { opacity: variant === 19 ? 0.55 : 0.85, transform: 'scale(1.0)' },
          { opacity: 0.0, transform: 'scale(1.1)' },
        ],
        { duration: 140, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)', fill: 'forwards' },
      );
    }

    // Variant specifics (1..10 kept as-is)
    switch (variant) {
      case 1:
        break;

      case 2: {
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.6)', opacity: 0.0 },
              { transform: 'scale(1.05)', opacity: 0.32 },
              { transform: 'scale(1.35)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 3: {
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.55)', opacity: 0.0 },
              { transform: 'scale(0.95)', opacity: 0.28 },
              { transform: 'scale(1.25)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ringB) {
          safeAnimate(
            ringB,
            [
              { transform: 'scale(0.4)', opacity: 0.0 },
              { transform: 'scale(0.9)', opacity: 0.18 },
              { transform: 'scale(1.55)', opacity: 0.0 },
            ],
            { duration: lifeMs, delay: 40, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 4: {
        for (const el of sparkRefs.current) {
          if (!el) continue;
          safeAnimate(
            el,
            [
              { transform: 'translateX(0px) scaleX(0.6)', opacity: 0.0 },
              { transform: 'translateX(10px) scaleX(1.0)', opacity: 0.42 },
              { transform: 'translateX(18px) scaleX(0.9)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.15, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 5:
      case 6: {
        for (const el of sparkRefs.current) {
          if (!el) continue;
          safeAnimate(
            el,
            [
              { transform: 'translateX(0px) scaleX(0.5)', opacity: 0.0 },
              { transform: 'translateX(10px) scaleX(1.0)', opacity: 0.35 },
              { transform: 'translateX(16px) scaleX(0.7)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 7: {
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.6) rotate(0deg)', opacity: 0.0 },
              { transform: 'scale(1.05) rotate(18deg)', opacity: 0.24 },
              { transform: 'scale(1.45) rotate(32deg)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        for (const el of particleRefs.current) {
          if (!el) continue;
          safeAnimate(
            el,
            [
              { transform: 'translateX(0px) scale(0.8)', opacity: 0.0 },
              { transform: 'translateX(10px) scale(1.0)', opacity: 0.3 },
              { transform: 'translateX(18px) scale(0.9)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 8: {
        if (ringB) {
          safeAnimate(
            ringB,
            [
              { transform: 'scale(0.55)', opacity: 0.0, filter: 'blur(2px)' },
              { transform: 'scale(1.1)', opacity: 0.18, filter: 'blur(6px)' },
              { transform: 'scale(1.75)', opacity: 0.0, filter: 'blur(10px)' },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.15, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 9: {
        if (scanH) {
          safeAnimate(
            scanH,
            [
              { transform: 'scaleX(0.2)', opacity: 0.0 },
              { transform: 'scaleX(1.0)', opacity: 0.28 },
              { transform: 'scaleX(1.0)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (scanV) {
          safeAnimate(
            scanV,
            [
              { transform: 'scaleY(0.2)', opacity: 0.0 },
              { transform: 'scaleY(1.0)', opacity: 0.22 },
              { transform: 'scaleY(1.0)', opacity: 0.0 },
            ],
            { duration: lifeMs, delay: 30, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ghost) {
          safeAnimate(
            ghost,
            [
              { transform: 'scale(1) translateX(0px)', opacity: 0.88 },
              { transform: 'scale(1.02) translateX(0.6px)', opacity: 0.66 },
              { transform: 'scale(0.9) translateX(-0.4px)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.85, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 10: {
        for (const el of particleRefs.current) {
          if (!el) continue;
          safeAnimate(
            el,
            [
              { transform: 'translateX(0px) scale(0.7)', opacity: 0.0 },
              { transform: 'translateX(12px) scale(1.0)', opacity: 0.28 },
              { transform: 'translateX(22px) scale(0.8)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      // --- 11..20 STRONG ---
      case 11: {
        // Big ring + flash + 8 rays
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.45)', opacity: 0.0 },
              { transform: 'scale(1.05)', opacity: 0.68 },
              { transform: 'scale(1.7)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 12: {
        // Electric burst (12 rays) + tiny jitter flash
        if (ringB) {
          safeAnimate(
            ringB,
            [
              { transform: 'scale(0.4)', opacity: 0.0 },
              { transform: 'scale(1.0)', opacity: 0.5 },
              { transform: 'scale(1.55)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (flash) {
          safeAnimate(
            flash,
            [
              { opacity: 0.0, transform: 'translateX(0px)' },
              { opacity: 0.9, transform: 'translateX(1.2px)' },
              { opacity: 0.0, transform: 'translateX(-1px)' },
            ],
            { duration: 120, easing: 'linear', fill: 'forwards' },
          );
        }
        break;
      }

      case 13: {
        // Shards (triangles)
        if (ringC) {
          safeAnimate(
            ringC,
            [
              { transform: 'scale(0.55)', opacity: 0.0 },
              { transform: 'scale(1.05)', opacity: 0.5 },
              { transform: 'scale(1.6)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        for (let i = 0; i < particleRefs.current.length; i++) {
          const el = particleRefs.current[i];
          const spec = particles[i];
          if (!el || !spec) continue;

          safeAnimate(
            el,
            [
              { transform: `translateX(0px) rotate(0deg) scale(0.85)`, opacity: 0.0 },
              { transform: `translateX(${spec.dist}px) rotate(${20 + spec.deg}deg) scale(1.0)`, opacity: 0.75 },
              { transform: `translateX(${spec.dist + 10}px) rotate(${60 + spec.deg}deg) scale(0.8)`, opacity: 0.0 },
            ],
            { duration: lifeMs, delay: spec.delay, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 14: {
        // Plasma swirl (conic) + ring
        if (swirl) {
          safeAnimate(
            swirl,
            [
              { transform: 'scale(0.4) rotate(0deg)', opacity: 0.0, filter: 'blur(2px)' },
              { transform: 'scale(1.05) rotate(80deg)', opacity: 0.65, filter: 'blur(6px)' },
              { transform: 'scale(1.65) rotate(160deg)', opacity: 0.0, filter: 'blur(10px)' },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.55)', opacity: 0.0 },
              { transform: 'scale(1.0)', opacity: 0.55 },
              { transform: 'scale(1.65)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.75, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 15: {
        // Pixel confetti
        if (ringB) {
          safeAnimate(
            ringB,
            [
              { transform: 'scale(0.45)', opacity: 0.0 },
              { transform: 'scale(1.0)', opacity: 0.45 },
              { transform: 'scale(1.55)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        for (let i = 0; i < particleRefs.current.length; i++) {
          const el = particleRefs.current[i];
          const spec = particles[i];
          if (!el || !spec) continue;

          safeAnimate(
            el,
            [
              { transform: `translateX(0px) rotate(0deg) scale(0.9)`, opacity: 0.0 },
              { transform: `translateX(${spec.dist}px) rotate(${spec.deg}deg) scale(1.0)`, opacity: 0.85 },
              { transform: `translateX(${spec.dist + 14}px) rotate(${spec.deg + 40}deg) scale(0.8)`, opacity: 0.0 },
            ],
            { duration: lifeMs, delay: spec.delay, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 16: {
        // Starburst long rays + double ring
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.45)', opacity: 0.0 },
              { transform: 'scale(1.05)', opacity: 0.65 },
              { transform: 'scale(1.75)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ringC) {
          safeAnimate(
            ringC,
            [
              { transform: 'scale(0.35)', opacity: 0.0 },
              { transform: 'scale(0.95)', opacity: 0.35 },
              { transform: 'scale(2.0)', opacity: 0.0 },
            ],
            { duration: lifeMs, delay: 40, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 17: {
        // Afterimage triple-ghost + ring
        if (ghost2) {
          safeAnimate(
            ghost2,
            [
              { transform: 'translate(0px, 0px) scale(1.0)', opacity: 0.0 },
              { transform: 'translate(3px, -2px) scale(1.05)', opacity: 0.55 },
              { transform: 'translate(6px, -4px) scale(1.0)', opacity: 0.0 },
            ],
            { duration: 260, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ghost3) {
          safeAnimate(
            ghost3,
            [
              { transform: 'translate(0px, 0px) scale(1.0)', opacity: 0.0 },
              { transform: 'translate(-3px, 2px) scale(1.05)', opacity: 0.45 },
              { transform: 'translate(-6px, 4px) scale(1.0)', opacity: 0.0 },
            ],
            { duration: 280, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ringB) {
          safeAnimate(
            ringB,
            [
              { transform: 'scale(0.5)', opacity: 0.0 },
              { transform: 'scale(1.05)', opacity: 0.55 },
              { transform: 'scale(1.75)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 18: {
        // Glitch pop: scanlines + strong flash
        if (scanH) {
          safeAnimate(
            scanH,
            [
              { transform: 'scaleX(0.2)', opacity: 0.0 },
              { transform: 'scaleX(1.0)', opacity: 0.75 },
              { transform: 'scaleX(1.0)', opacity: 0.0 },
            ],
            { duration: 240, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (scanV) {
          safeAnimate(
            scanV,
            [
              { transform: 'scaleY(0.2)', opacity: 0.0 },
              { transform: 'scaleY(1.0)', opacity: 0.6 },
              { transform: 'scaleY(1.0)', opacity: 0.0 },
            ],
            { duration: 260, delay: 30, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.45)', opacity: 0.0 },
              { transform: 'scale(1.0)', opacity: 0.55 },
              { transform: 'scale(1.65)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 19: {
        // Smoke puff: big slow blur (glow already does a lot; add ring for shape)
        if (ringC) {
          safeAnimate(
            ringC,
            [
              { transform: 'scale(0.35)', opacity: 0.0, filter: 'blur(2px)' },
              { transform: 'scale(1.25)', opacity: 0.35, filter: 'blur(10px)' },
              { transform: 'scale(2.2)', opacity: 0.0, filter: 'blur(18px)' },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.6, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }

      case 20: {
        // Portal pop: thick ring + inner pulse
        if (ringA) {
          safeAnimate(
            ringA,
            [
              { transform: 'scale(0.35)', opacity: 0.0 },
              { transform: 'scale(1.05)', opacity: 0.75 },
              { transform: 'scale(1.9)', opacity: 0.0 },
            ],
            { duration: lifeMs, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        if (ringB) {
          safeAnimate(
            ringB,
            [
              { transform: 'scale(0.25)', opacity: 0.0 },
              { transform: 'scale(0.95)', opacity: 0.55 },
              { transform: 'scale(1.5)', opacity: 0.0 },
            ],
            { duration: lifeMs, delay: 40, easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
          );
        }
        break;
      }
    }

    // Shared: sparks animation (for all variants that render them)
    if (sparkAngles.length > 0) {
      for (const el of sparkRefs.current) {
        if (!el) continue;
        safeAnimate(
          el,
          [
            { transform: 'translateX(0px) scaleX(0.45)', opacity: 0.0 },
            { transform: `translateX(${strong ? 18 : 10}px) scaleX(1.0)`, opacity: sparkOpacity },
            { transform: `translateX(${strong ? 30 : 16}px) scaleX(0.7)`, opacity: 0.0 },
          ],
          { duration: Math.min(lifeMs, strong ? 320 : lifeMs), easing: 'cubic-bezier(0.12, 0.8, 0.2, 1)', fill: 'forwards' },
        );
      }
    }

    const t = window.setTimeout(() => onDone(burst.id), lifeMs + 20);
    return () => window.clearTimeout(t);
  }, [burst.id, lifeMs, onDone, particles, reducedMotionHint, sparkAngles.length, sparkOpacity, strong, variant]);

  // Visual tokens
  const ringAStyle: React.CSSProperties = {
    border: variant >= 11 ? '2px solid rgba(255,255,255,0.22)' : '1px solid rgba(230,205,255,0.26)',
    boxShadow:
      variant >= 11 ? '0 0 18px rgba(34,211,238,0.35), 0 0 22px rgba(185,95,255,0.22)' : '0 0 10px rgba(185,95,255,0.18), 0 0 16px rgba(34,211,238,0.12)',
  };

  const ringBStyle: React.CSSProperties = {
    border: variant >= 11 ? '2px solid rgba(34,211,238,0.20)' : '1px solid rgba(34,211,238,0.18)',
    boxShadow:
      variant >= 11 ? '0 0 20px rgba(34,211,238,0.28), 0 0 24px rgba(185,95,255,0.18)' : '0 0 14px rgba(34,211,238,0.16), 0 0 18px rgba(185,95,255,0.08)',
  };

  const ringCStyle: React.CSSProperties = {
    border: '2px solid rgba(185,95,255,0.18)',
    boxShadow: '0 0 24px rgba(185,95,255,0.22), 0 0 28px rgba(34,211,238,0.16)',
    filter: 'blur(0px)',
  };

  const swirlStyle: React.CSSProperties = {
    background: 'conic-gradient(from 0deg, rgba(34,211,238,0.0), rgba(34,211,238,0.38), rgba(185,95,255,0.28), rgba(34,211,238,0.0))',
    mixBlendMode: 'screen',
  };

  const scanlineGlow =
    variant >= 11 ? '0 0 16px rgba(34,211,238,0.24), 0 0 18px rgba(185,95,255,0.16)' : '0 0 10px rgba(34,211,238,0.18), 0 0 14px rgba(185,95,255,0.12)';

  const particleStyleFor = (spec: MiniParticleSpec): React.CSSProperties => {
    if (spec.kind === 'pixel') {
      return {
        width: spec.size,
        height: spec.size,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 0 12px rgba(34,211,238,0.28), 0 0 14px rgba(185,95,255,0.18)',
        opacity: 0,
        transform: 'translateX(0px) rotate(0deg) scale(0.9)',
        mixBlendMode: 'screen',
      };
    }

    if (spec.kind === 'tri') {
      return {
        width: spec.size,
        height: spec.size,
        background: 'rgba(255,255,255,0.85)',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        boxShadow: '0 0 12px rgba(34,211,238,0.25), 0 0 14px rgba(185,95,255,0.18)',
        opacity: 0,
        transform: 'translateX(0px) rotate(0deg) scale(0.85)',
        mixBlendMode: 'screen',
      };
    }

    // dot
    return {
      width: spec.size,
      height: spec.size,
      borderRadius: 999,
      background: 'rgba(255,255,255,0.32)',
      boxShadow: '0 0 10px rgba(34,211,238,0.14), 0 0 14px rgba(185,95,255,0.10)',
      opacity: 0,
      transform: 'translateX(0px) scale(0.8)',
      mixBlendMode: 'screen',
    };
  };

  return (
    <div
      className="absolute"
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    >
      {/* Glow */}
      <div
        ref={glowRef}
        className="absolute inset-[-12px] rounded-full"
        style={{
          background:
            variant >= 11
              ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.20) 0%, rgba(34,211,238,0.22) 18%, rgba(185,95,255,0.16) 42%, rgba(0,0,0,0) 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.16) 0%, rgba(185,95,255,0.10) 32%, rgba(0,0,0,0) 65%)',
          opacity: 0,
          mixBlendMode: 'screen',
        }}
      />

      {/* Strong flash overlay */}
      <div
        ref={flashRef}
        className="absolute inset-0 rounded-xl"
        style={{
          opacity: 0,
          background: 'rgba(255,255,255,0.85)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Plasma swirl (variant 14) */}
      <div ref={swirlRef} className="absolute inset-[-14px] rounded-full" style={{ opacity: 0, ...swirlStyle }} />

      {/* Ghost tile */}
      <div ref={ghostRef} className="absolute inset-0" style={{ opacity: 0.92 }}>
        <Tile type={burst.type} />
      </div>

      {/* Extra afterimages (variant 17) */}
      <div
        ref={ghost2Ref}
        className="absolute inset-0"
        style={{
          opacity: 0,
          filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.35))',
          mixBlendMode: 'screen',
        }}
      >
        <Tile type={burst.type} />
      </div>
      <div
        ref={ghost3Ref}
        className="absolute inset-0"
        style={{
          opacity: 0,
          filter: 'drop-shadow(0 0 10px rgba(185,95,255,0.35))',
          mixBlendMode: 'screen',
        }}
      >
        <Tile type={burst.type} />
      </div>

      {/* Rings */}
      <div ref={ringARef} className="absolute inset-[-8px] rounded-full" style={{ opacity: 0, ...ringAStyle }} />
      <div ref={ringBRef} className="absolute inset-[-12px] rounded-full" style={{ opacity: 0, ...ringBStyle }} />
      <div ref={ringCRef} className="absolute inset-[-16px] rounded-full" style={{ opacity: 0, ...ringCStyle }} />

      {/* Scanlines */}
      <div
        ref={scanHRef}
        className="absolute left-[-12px] right-[-12px] top-1/2"
        style={{
          height: variant >= 11 ? 3 : 2,
          transform: 'translateY(-50%) scaleX(0.2)',
          opacity: 0,
          background: variant >= 11 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
          boxShadow: scanlineGlow,
          mixBlendMode: 'screen',
        }}
      />
      <div
        ref={scanVRef}
        className="absolute top-[-12px] bottom-[-12px] left-1/2"
        style={{
          width: variant >= 11 ? 3 : 2,
          transform: 'translateX(-50%) scaleY(0.2)',
          opacity: 0,
          background: variant >= 11 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)',
          boxShadow: scanlineGlow,
          mixBlendMode: 'screen',
        }}
      />

      {/* Sparks (rays) */}
      {sparkAngles.length > 0 ? (
        <div className="absolute left-1/2 top-1/2">
          {sparkAngles.map((deg, i) => (
            <div
              key={`s-${deg}`}
              className="absolute"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                transformOrigin: 'center',
              }}
            >
              <div
                ref={(el) => {
                  sparkRefs.current[i] = el;
                }}
                style={{
                  width: sparkLen,
                  height: sparkThickness,
                  borderRadius: isShardClassic ? 2 : 999,
                  background: `rgba(255,255,255,${sparkOpacity})`,
                  boxShadow:
                    variant >= 11
                      ? '0 0 16px rgba(34,211,238,0.30), 0 0 18px rgba(185,95,255,0.18)'
                      : isShardClassic
                        ? '0 0 10px rgba(34,211,238,0.14)'
                        : '0 0 10px rgba(185,95,255,0.12), 0 0 12px rgba(34,211,238,0.10)',
                  opacity: 0,
                  transform: 'translateX(0px) scaleX(0.6)',
                  mixBlendMode: 'screen',
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Mini particles (dots/pixels/tris) */}
      {particles.length > 0 ? (
        <div className="absolute left-1/2 top-1/2">
          {particles.map((spec, i) => (
            <div
              key={`p-${spec.kind}-${spec.deg}`}
              className="absolute"
              style={{
                transform: `translate(-50%, -50%) rotate(${spec.deg}deg)`,
                transformOrigin: 'center',
              }}
            >
              <div
                ref={(el) => {
                  particleRefs.current[i] = el;
                }}
                style={particleStyleFor(spec)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
