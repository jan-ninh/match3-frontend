import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '@/components/Modal';
import ProgressBar from '@/components/profileDashboard/ProgressBar';

import type { ExpPreview, PowerId } from './overlayContext';

type Props = {
  open: boolean;
  title: string;
  expPreview?: ExpPreview;
  onClose: () => void;
  onChoose: (powerId: PowerId) => void;
};

const powerIds: PowerId[] = ['gridlaser', 'laser', 'extraShuffle'];

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

export default function PowerChoiceModal({ open, title, expPreview, onClose, onChoose }: Props) {
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const [expUi, setExpUi] = useState<ExpUiState | null>(null);

  const expRequired = useMemo(() => {
    if (!expPreview) return 3000;
    const req = safeInt(expPreview.expRequired, 3000);
    return req > 0 ? req : 3000;
  }, [expPreview]);

  const clearAnim = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const animateInt = useCallback(
    (from: number, to: number, durationMs: number, onUpdate: (v: number) => void, onDone?: () => void) => {
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
    },
    [],
  );

  // EXP animation: starts when modal opens (so player "sees" +EXP even before picking reward).
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

    // Duration tuning: readable but not sluggish.
    const D1 = 720;
    const D2 = 640;
    const LEVEL_UP_FLASH_MS = 650;
    const GAP_MS = 140;

    if (levelsGained <= 0) {
      animateInt(fromCur, toCur, D1, (v) => setExpUi(computeUi(fromLevel, v, expRequired, false)));
      return;
    }

    // Phase 1: fill to 100%
    animateInt(fromCur, expRequired, D1, (v) => setExpUi(computeUi(fromLevel, v, expRequired, false)), () => {
      // Level up moment: reset bar, bump level, flash.
      setExpUi(computeUi(fromLevel + 1, 0, expRequired, true));

      const t1 = window.setTimeout(() => {
        setExpUi((prev) => {
          if (!prev) return prev;
          return { ...prev, showLevelUp: false };
        });
      }, LEVEL_UP_FLASH_MS);
      timersRef.current.push(t1);

      const t2 = window.setTimeout(() => {
        if (toCur <= 0) {
          setExpUi(computeUi(fromLevel + 1, 0, expRequired, false));
          return;
        }

        animateInt(0, toCur, D2, (v) => setExpUi(computeUi(fromLevel + 1, v, expRequired, false)));
      }, GAP_MS);
      timersRef.current.push(t2);
    });

    return () => clearAnim();
  }, [animateInt, clearAnim, expPreview, expRequired, open]);

  const onPick = (id: PowerId) => {
    // Reward application + backend persistence are handled by DevtoolsHost onChoose.
    onChoose(id);
  };

  return (
    <Modal open={open} onClose={onClose} title="Boosters" size="md" closeOnBackdrop={false}>
      <div className="relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-2xl font-semibold text-cyan-600">{title}</div>

          {expPreview && expUi && (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] tracking-wide text-emerald-300/80">+{safeInt(expPreview.expDelta, 1000).toLocaleString()} EXP</p>
                {expUi.showLevelUp && <p className="text-[12px] tracking-wide text-fuchsia-300/85">LEVEL UP!</p>}
              </div>

              <ProgressBar percent={expUi.percent} playerLevel={expUi.level} expCurrent={expUi.expCurrent} expRequired={expRequired} />
            </div>
          )}

          <div className="flex gap-3 mt-2">
            {powerIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                className="px-3 py-2 rounded-lg text-black hover:bg-yellow-400 flex items-center justify-center"
                aria-label={`choose ${id}`}
              >
                <img src={`/icons/${id}.png`} alt={id} className="w-8 h-8" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
