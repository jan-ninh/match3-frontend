// src/features/overlays/OverlayMissionReport.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '@/components/Modal';
import ProgressBar from '@/components/profileDashboard/ProgressBar';

import type { ExpPreview } from './overlayContext';

type Props = {
  open: boolean;
  expPreview?: ExpPreview;
  onClose: () => void;
  onPrimary: () => void;
};

/**
 * EXP animation timing knobs (ms).
 * Adjust these values to tune the "feel".
 */
const EXP_ANIM = {
  startDelayMs: 900,
  fillTo100Ms: 720,
  afterLevelUpMs: 640,
  levelUpFlashMs: 650,
  gapMs: 140,
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function safeInt(n: unknown, fallback: number): number {
  if (typeof n !== 'number') return fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function posMod(n: number, m: number): number {
  if (m <= 0) return 0;
  const r = n % m;
  return r < 0 ? r + m : r;
}

type ExpUiState = {
  level: number;
  expCurrent: number;
  percent: number;
  showLevelUp: boolean;
};

function computeUi(level: number, expCurrent: number, expRequired: number, showLevelUp: boolean): ExpUiState {
  const req = expRequired > 0 ? expRequired : 3000;
  const cur = clamp(expCurrent, 0, req);
  const percent = req > 0 ? (cur / req) * 100 : 0;
  return { level: Math.max(1, level), expCurrent: cur, percent: clamp(percent, 0, 100), showLevelUp };
}

export default function OverlayMissionReport({ open, expPreview, onClose, onPrimary }: Props) {
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const [expUi, setExpUi] = useState<ExpUiState | null>(null);

  const expRequired = useMemo(() => {
    if (!expPreview) return 3000;
    const req = safeInt(expPreview.expRequired, 3000);
    return req > 0 ? req : 3000;
  }, [expPreview]);

  const hasLevelUp = useMemo(() => {
    if (!expPreview) return false;
    const fromLevel = Math.max(1, safeInt(expPreview.fromLevel, 1));
    const toLevel = Math.max(1, safeInt(expPreview.toLevel, fromLevel));
    return toLevel > fromLevel;
  }, [expPreview]);

  const clearAnim = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const animateInt = useCallback((from: number, to: number, durationMs: number, onUpdate: (v: number) => void, onDone?: () => void) => {
    const startRef = { t0: 0 };

    const step = (ts: number) => {
      if (!startRef.t0) startRef.t0 = ts;

      const elapsed = ts - startRef.t0;
      const t = durationMs <= 0 ? 1 : clamp(elapsed / durationMs, 0, 1);

      const v = Math.round(from + (to - from) * t);
      onUpdate(v);

      if (t >= 1) {
        rafRef.current = null;
        onDone?.();
        return;
      }

      rafRef.current = window.requestAnimationFrame(step);
    };

    rafRef.current = window.requestAnimationFrame(step);
  }, []);

  // EXP animation: starts when the MissionReport is visible.
  useEffect(() => {
    if (!open || !expPreview) {
      clearAnim();
      setExpUi(null);
      return;
    }

    clearAnim();

    const fromLevel = Math.max(1, safeInt(expPreview.fromLevel, 1));
    const toLevel = Math.max(1, safeInt(expPreview.toLevel, fromLevel));
    const fromTotal = Math.max(0, safeInt(expPreview.fromExpTotal, 0));
    const toTotal = Math.max(0, safeInt(expPreview.toExpTotal, fromTotal));

    const fromCur = posMod(fromTotal, expRequired);
    const toCur = posMod(toTotal, expRequired);

    const levelsGained = Math.max(0, toLevel - fromLevel);

    // initial state (before growth)
    setExpUi(computeUi(fromLevel, fromCur, expRequired, false));

    const start = () => {
      if (levelsGained <= 0) {
        animateInt(fromCur, toCur, EXP_ANIM.fillTo100Ms, (v) => setExpUi(computeUi(fromLevel, v, expRequired, false)));
        return;
      }

      // Phase 1: fill to 100%
      animateInt(
        fromCur,
        expRequired,
        EXP_ANIM.fillTo100Ms,
        (v) => setExpUi(computeUi(fromLevel, v, expRequired, false)),
        () => {
          // Level up moment: reset bar, bump level, flash.
          setExpUi(computeUi(fromLevel + 1, 0, expRequired, true));

          const t1 = window.setTimeout(() => {
            setExpUi((prev) => {
              if (!prev) return prev;
              return { ...prev, showLevelUp: false };
            });
          }, EXP_ANIM.levelUpFlashMs);
          timersRef.current.push(t1);

          const t2 = window.setTimeout(() => {
            if (toCur <= 0) {
              setExpUi(computeUi(fromLevel + 1, 0, expRequired, false));
              return;
            }

            animateInt(0, toCur, EXP_ANIM.afterLevelUpMs, (v) => setExpUi(computeUi(fromLevel + 1, v, expRequired, false)));
          }, EXP_ANIM.gapMs);
          timersRef.current.push(t2);
        },
      );
    };

    const t0 = window.setTimeout(start, Math.max(0, EXP_ANIM.startDelayMs));
    timersRef.current.push(t0);

    return () => clearAnim();
  }, [animateInt, clearAnim, expPreview, expRequired, open]);

  const primaryLabel = hasLevelUp ? 'Level up' : 'Return to Map';

  return (
    <Modal open={open} onClose={onClose} title="Mission Report" size="md" closeOnBackdrop={false}>
      <div className="relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-2xl font-semibold text-cyan-600">Mission Report</div>

          {expPreview && expUi && (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] tracking-wide text-emerald-300/80">+{safeInt(expPreview.expDelta, 1000).toLocaleString()} EXP</p>
                {expUi.showLevelUp && <p className="text-[12px] tracking-wide text-fuchsia-300/85">LEVEL UP!</p>}
              </div>

              <ProgressBar percent={expUi.percent} playerLevel={expUi.level} expCurrent={expUi.expCurrent} expRequired={expRequired} />
            </div>
          )}

          <div className="mt-2 w-full flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onPrimary}
              className="h-10 px-5 rounded-lg border border-white/10 bg-cyan-500/20 hover:bg-cyan-500/30 active:bg-cyan-500/35 text-cyan-50 transition-colors select-none"
            >
              {primaryLabel}
            </button>

            {hasLevelUp && <div className="text-xs text-white/60">Claim your reward on the next screen.</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
