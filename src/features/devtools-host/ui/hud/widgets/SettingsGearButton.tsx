// src/features/devtools-host/ui/hud/widgets/SettingsGearButton.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useOverlays } from '@/features/overlays/useOverlays';
import { playSfx } from '@/features/audio/sfx/sfxPlayer';

type Props = {
  /**
   * Vite public asset path (default: /public/icons/settings-gear02.png)
   * -> runtime URL: /icons/settings-gear02.png
   */
  iconSrc?: string;
};

function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** 0..1 -> 0..1, fast start, slow end (no abrupt stop). */
function easeOutCubic(t: number): number {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}

type Tween = {
  startTs: number | null;
  from: number;
  to: number;
  durationMs: number;
};

export function SettingsGearButton({ iconSrc = '/icons/settings-gear02.png' }: Props) {
  const { openSettings } = useOverlays();

  const [hovered, setHovered] = useState(false);

  // Best-effort: keep rotation "held" while the Settings overlay is open,
  // and only release 1.5s after the overlay closes.
  const [settingsOverlayOpen, setSettingsOverlayOpen] = useState(false);
  const [holdRotation, setHoldRotation] = useState(false);

  const holdRotationRef = useRef(false);
  const releaseTimeoutRef = useRef<number | null>(null);

  const SETTINGS_CLOSE_RELEASE_DELAY_MS = 0;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const glowCoreRef = useRef<HTMLSpanElement | null>(null);
  const glowHaloRef = useRef<HTMLSpanElement | null>(null);

  // Detect Settings overlay presence (DOM heuristic).
  // Long-term "pro" fix would be a dedicated overlay-state signal from the overlays system,
  // but this works without touching overlay internals.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const hasSettingsOverlay = (): boolean => {
      // Prefer explicit markers if present.
      const direct = document.querySelector(
        ['[data-overlay="settings"]', '[data-overlay-id="settings"]', '[data-overlay-key="settings"]', '#settings-overlay', '#settings-modal'].join(','),
      );
      if (direct) return true;

      // Fallback: look for dialogs mentioning "Settings" (or "Einstellungen").
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]');
      for (const el of dialogs) {
        const aria = (el.getAttribute('aria-label') ?? '').toLowerCase();
        if (aria.includes('settings') || aria.includes('einstellungen')) return true;

        const text = (el.textContent ?? '').toLowerCase();
        if (text.includes('settings') || text.includes('einstellungen')) return true;
      }

      return false;
    };

    let last = hasSettingsOverlay();
    setSettingsOverlayOpen(last);

    const update = () => {
      const next = hasSettingsOverlay();
      if (next === last) return;
      last = next;
      setSettingsOverlayOpen(next);
    };

    const mo = new MutationObserver(update);
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden', 'hidden'],
    });

    window.addEventListener('focus', update, true);
    window.addEventListener('keydown', update, true);

    return () => {
      mo.disconnect();
      window.removeEventListener('focus', update, true);
      window.removeEventListener('keydown', update, true);
    };
  }, []);

  // Hold rotation while overlay is open; release with delay after it closes.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const clearRelease = () => {
      if (releaseTimeoutRef.current === null) return;
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    };

    if (settingsOverlayOpen) {
      clearRelease();
      if (!holdRotationRef.current) {
        holdRotationRef.current = true;
        setHoldRotation(true);
      }
      return;
    }

    if (!holdRotationRef.current) return;

    clearRelease();
    releaseTimeoutRef.current = window.setTimeout(() => {
      holdRotationRef.current = false;
      setHoldRotation(false);
      releaseTimeoutRef.current = null;
    }, SETTINGS_CLOSE_RELEASE_DELAY_MS);

    return () => clearRelease();
  }, [settingsOverlayOpen]);

  const onClick = useCallback(() => {
    // Immediately hold on click (prevents a 1-frame "return" if hover drops before overlay mounts).
    if (typeof window !== 'undefined' && releaseTimeoutRef.current !== null) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
    holdRotationRef.current = true;
    setHoldRotation(true);

    openSettings();
  }, [openSettings]);

  const onPointerEnter = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    setHovered(true);

    // Hover sound is intentionally mouse-only (touch devices don't "hover").
    // Note: audio playback may still be blocked until the first user gesture unlocks audio.
    if (e.pointerType === 'mouse') playSfx('uiSettingsHover', { volume: 0 });
  }, []);

  const onPointerLeave = useCallback(() => setHovered(false), []);

  /**
   * Tempo / feel:
   * - MAX_DEG: the maximum rotation you stop at (e.g. 20deg = "subtle tilt").
   * - HOVER_IN_MS: how long it takes to reach MAX_DEG (ease-out: slows near the end).
   * - HOVER_OUT_MS: how long it takes to return to 0deg (usually a bit slower).
   */
  const MAX_DEG = 50;
  const HOVER_IN_MS = 620;
  const HOVER_OUT_MS = 1920;

  /**
   * Glow feel:
   * - We drive glow opacity via rAF so it's consistent with the rotate tween.
   * - Glow stays “in container”, but looks radial (no boxy edges) via radial-gradient.
   */
  const GLOW_IN_MS = 260;
  const GLOW_OUT_MS = 760;

  /**
   * “Breathing” (hover-only):
   * - Subtle amplitude so it reads premium (not arcade).
   */
  const BREATH_PERIOD_MS = 3200;
  const BREATH_OPACITY_AMP = 0.08;
  const BREATH_SCALE_AMP = 0.012;

  // One rAF loop drives BOTH:
  // - angle tween (hover in/out)
  // - glow tween (hover in/out) + breathing (hover-only)
  const rafRef = useRef<number | null>(null);

  const angleRef = useRef<number>(0);
  const glowBaseRef = useRef<number>(0); // 0..1, fades in/out (breath is multiplicative)
  const hoverStartTsRef = useRef<number>(0);

  const angleTweenRef = useRef<Tween | null>(null);
  const glowTweenRef = useRef<Tween | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    const core = glowCoreRef.current;
    const halo = glowHaloRef.current;
    if (!img || !core || !halo) return;

    const angleActive = hovered || holdRotation;

    const stop = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      angleTweenRef.current = null;
      glowTweenRef.current = null;
    };

    const applyAngle = (deg: number) => {
      angleRef.current = deg;
      // `transform-gpu` class is overridden by inline transform,
      // so include translateZ(0) explicitly to keep GPU-friendly compositing.
      img.style.transform = `translateZ(0) rotate(${deg.toFixed(3)}deg)`;
    };

    const setGlowBase = (v: number) => {
      glowBaseRef.current = clamp01(v);
    };

    const applyGlow = (ts: number) => {
      const base = glowBaseRef.current;

      // Hover-only breathing (subtle).
      const hoveredNow = hovered;
      const t0 = hoverStartTsRef.current || ts;
      const phase = ((ts - t0) / BREATH_PERIOD_MS) * Math.PI * 2;
      const breath = hoveredNow ? 1 + BREATH_OPACITY_AMP * Math.sin(phase) : 1;

      const coreOpacity = clamp01(base * 0.85 * breath);
      const haloOpacity = clamp01(base * 0.45 * breath);

      const s = hoveredNow ? 1 + BREATH_SCALE_AMP * Math.sin(phase) : 1;
      const sHalo = hoveredNow ? 1 + BREATH_SCALE_AMP * 1.6 * Math.sin(phase) : 1;

      core.style.opacity = coreOpacity.toFixed(3);
      halo.style.opacity = haloOpacity.toFixed(3);

      // Gentle “inflate” to avoid static glow feel (still clipped-safe due to fast fade to transparent).
      core.style.transform = `translateZ(0) scale(${s.toFixed(4)})`;
      halo.style.transform = `translateZ(0) scale(${sHalo.toFixed(4)})`;
    };

    const startTween = (twRef: MutableRefObject<Tween | null>, from: number, to: number, durationMs: number) => {
      if (Math.abs(to - from) < 0.001 && twRef.current === null) return;

      twRef.current = {
        startTs: null,
        from,
        to,
        durationMs,
      };
    };

    const stepTween = (ts: number, twRef: MutableRefObject<Tween | null>, apply: (v: number) => void): boolean => {
      const tw = twRef.current;
      if (!tw) return true;

      if (tw.startTs === null) tw.startTs = ts;

      const t = (ts - tw.startTs) / tw.durationMs;
      const p = easeOutCubic(t);

      const next = tw.from + (tw.to - tw.from) * p;
      apply(next);

      if (t >= 1) {
        apply(tw.to);
        twRef.current = null;
        return true;
      }

      return false;
    };

    const tick = (ts: number) => {
      // When hover starts, set a stable “breath origin” (so it doesn't jump).
      if (hovered && hoverStartTsRef.current === 0) hoverStartTsRef.current = ts;
      if (!hovered && hoverStartTsRef.current !== 0) hoverStartTsRef.current = 0;

      stepTween(ts, angleTweenRef, applyAngle);
      stepTween(ts, glowTweenRef, setGlowBase);

      applyGlow(ts);

      const hasWork = hovered || holdRotation || angleTweenRef.current !== null || glowTweenRef.current !== null;
      if (!hasWork) {
        stop();
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    // Static gradient setup (no Tailwind arbitrary variants; no extractor risk).
    // IMPORTANT: Gradients fade to transparent WELL before the edge -> no “box” feeling.
    const RGB = '34,211,238'; // cyan-400-ish; change here if you want crimson instead.
    core.style.background = `radial-gradient(circle at 50% 50%, rgba(${RGB},0.55) 0%, rgba(${RGB},0.24) 26%, rgba(${RGB},0.08) 46%, rgba(${RGB},0) 64%)`;
    halo.style.background = `radial-gradient(circle at 50% 50%, rgba(${RGB},0.20) 0%, rgba(${RGB},0.08) 38%, rgba(${RGB},0.02) 56%, rgba(${RGB},0) 74%)`;

    // Keep filter transitions purely in CSS; we only drive transform + glow spans.
    img.style.transitionProperty = 'filter';
    img.style.transitionDuration = '300ms';
    img.style.transitionTimingFunction = 'ease-out';

    // Ensure we start from current visuals (no 1-frame pop).
    applyAngle(angleRef.current);
    applyGlow(window.performance?.now?.() ?? 0);

    // Drive state transitions.
    if (angleActive) {
      startTween(angleTweenRef, angleRef.current, MAX_DEG, HOVER_IN_MS);
    } else {
      startTween(angleTweenRef, angleRef.current, 0, HOVER_OUT_MS);
    }

    if (hovered) {
      startTween(glowTweenRef, glowBaseRef.current, 1, GLOW_IN_MS);
    } else {
      startTween(glowTweenRef, glowBaseRef.current, 0, GLOW_OUT_MS);
    }

    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(tick);

    return () => stop();
  }, [hovered, holdRotation]);

  return (
    <button
      type="button"
      aria-label="Open settings"
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className={[
        'relative inline-flex items-center justify-center select-none',
        // comfortable hitbox (icon itself smaller)
        'w-80 h-80 rounded-lg',
        // interaction
        'cursor-pointer',
        // focus
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70',
      ].join(' ')}
    >
      {/* Radial glow layers (rAF drives opacity + subtle “breathing”) */}
      <span
        ref={glowHaloRef}
        aria-hidden="true"
        className={['pointer-events-none absolute inset-0 rounded-lg', 'opacity-0', 'blur-2xl', 'will-change-transform'].join(' ')}
      />
      <span
        ref={glowCoreRef}
        aria-hidden="true"
        className={['pointer-events-none absolute inset-0 rounded-lg', 'opacity-0', 'blur-lg', 'will-change-transform'].join(' ')}
      />

      <img
        ref={imgRef}
        src={iconSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={320}
        height={320}
        className={[
          'relative z-10 w-80 h-80 object-contain pointer-events-none',
          // keep origin stable; transform is driven by JS
          'origin-center will-change-transform',
          // edge glow (kept as filter; OK for one icon)
          'transition-[filter] duration-300 ease-out',
          hovered ? 'brightness-125 drop-shadow-[0_0_10px_rgba(34,211,238,0.85)]' : 'brightness-100 drop-shadow-none',
        ].join(' ')}
      />
    </button>
  );
}
