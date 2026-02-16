// src/components/footer/GameFooter.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { footerActions } from './footerAction';
import { usePowers } from '@/context/PowerContext';
import { useAuth } from '@/context/AuthContext';
import {
  POWER_ARM_EVENT,
  POWER_CONSUME_EVENT,
  POWER_GRANT_EVENT,
  POWER_USE_EVENT,
  type PowerArmDetail,
  type PowerConsumeDetail,
  type PowerGrantDetail,
  type PowerUseDetail,
} from '@/context/powerEvents';
import { playSfx } from '@/features/audio';
import type { PowerKey, Powers } from '@/types';

type Props = {
  openSettings: () => void;
};

type FooterActionItem = ReturnType<typeof footerActions>[number];

const DEFAULT_ICON_PX_ACTIVE = 60;

// Set numbers for each Button
const ICON_PX_ACTIVE_BOMB = 65;
const ICON_PX_ACTIVE_LASER = 80;
const ICON_PX_ACTIVE_RESHUFFLE = 60;
const ICON_PX_ACTIVE_ITEM4 = 60;
const ICON_PX_ACTIVE_SETTINGS = 60;

/**
 * Per-button icon sizing (active).
 * - Add entries by `item.id` (string).
 * - Missing ids fall back to DEFAULT_ICON_PX_ACTIVE.
 */
const ICON_PX_ACTIVE_BY_ID: Readonly<Partial<Record<string, number>>> = {
  bomb: ICON_PX_ACTIVE_BOMB,
  laser: ICON_PX_ACTIVE_LASER,
  reshuffle: ICON_PX_ACTIVE_RESHUFFLE,
  extraShuffle: ICON_PX_ACTIVE_RESHUFFLE, // alias: current PowerKey id
  item4: ICON_PX_ACTIVE_ITEM4,
  settings: ICON_PX_ACTIVE_SETTINGS,
};

function isCounted(item: FooterActionItem): item is FooterActionItem & { count: number } {
  return typeof item.count === 'number';
}

export default function GameFooter({ openSettings }: Props) {
  const { powers, setPowers } = usePowers();
  const { user, updatePowers } = useAuth();

  const [armedBomb, setArmedBomb] = useState(false);

  /**
   * Keep latest powers ONLY for window event listeners (effects).
   * Important: do NOT read this ref in render-path callbacks (e.g. `onUsePower`) that are passed into UI builders.
   */
  const powersRef = useRef<Powers>(powers);
  useEffect(() => {
    powersRef.current = powers;
  }, [powers]);

  const nextRequestIdRef = useRef(1);

  const allocRequestId = useCallback((): number => {
    const v = nextRequestIdRef.current | 0;
    nextRequestIdRef.current = (v + 1) | 0;
    return Math.max(1, v);
  }, []);

  const emitArmBomb = useCallback((armed: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed } }));
  }, []);

  const emitUsePower = useCallback(
    (key: PowerKey) => {
      if (typeof window === 'undefined') return;
      const requestId = allocRequestId();
      window.dispatchEvent(new CustomEvent<PowerUseDetail>(POWER_USE_EVENT, { detail: { key, requestId } }));
    },
    [allocRequestId],
  );

  // Safety: if bomb count hits 0 while armed, disarm (prevents "stuck targeting")
  useEffect(() => {
    const cur = (powers.bomb ?? 0) | 0;
    if (cur > 0) return;
    if (!armedBomb) return;

    setArmedBomb(false);
    emitArmBomb(false);
  }, [armedBomb, emitArmBomb, powers.bomb]);

  // Sync with global arm/disarm (Grid can disarm after confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;
      setArmedBomb(!!d.armed);
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    return () => window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
  }, []);

  /**
   * Power grants via event (reward overlays etc.).
   * Consumption is ack-driven via POWER_CONSUME_EVENT (emitted by the engine bridge after EngineEvent `powerUsed`).
   * Here we only apply grants and (optionally) persist them.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onGrant = (e: Event) => {
      const ce = e as CustomEvent<PowerGrantDetail>;
      const d = ce.detail;
      if (!d) return;
      if (typeof d.delta !== 'number') return;

      const delta = d.delta | 0;
      if (delta === 0) return;

      const cur = (powersRef.current[d.key] ?? 0) | 0;
      const next: Powers = { ...powersRef.current, [d.key]: cur + delta };

      setPowers(next);

      if (!user) return;

      updatePowers({ [d.key]: next[d.key] }, 'set').catch(() => {
        setPowers(powersRef.current);
      });
    };

    window.addEventListener(POWER_GRANT_EVENT, onGrant as EventListener);
    return () => window.removeEventListener(POWER_GRANT_EVENT, onGrant as EventListener);
  }, [setPowers, updatePowers, user]);

  /**
   * Persist ack-driven consumption (backend is not the SSOT for immediate UI).
   * Note: We compute `nextVal` from the ref-snapshot to avoid depending on React state timing.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume = (e: Event) => {
      if (!user) return;

      const ce = e as CustomEvent<PowerConsumeDetail>;
      const d = ce.detail;
      if (!d) return;

      const amount = d.amount | 0;
      if (amount <= 0) return;

      const key = d.key;

      const cur = (powersRef.current[key] ?? 0) | 0;
      const nextVal = Math.max(0, cur - amount);
      if (nextVal === cur) return;

      updatePowers({ [key]: nextVal }, 'set').catch(() => {
        // Best-effort: local UI already consumed; backend sync can be retried later.
      });
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
  }, [updatePowers, user]);

  const onUsePower = useCallback(
    async (key: PowerKey) => {
      const current = (powers[key] ?? 0) | 0;
      if (current <= 0) {
        // if user tries to arm with 0, make sure it's off
        if (key === 'bomb' && armedBomb) {
          setArmedBomb(false);
          emitArmBomb(false);
        }
        return;
      }

      /**
       * Bomb = targeting mode only (arm/disarm).
       * Inventory spend is applied centrally by PowerProvider when it receives POWER_CONSUME_EVENT
       * (emitted by the engine-event bridge after EngineEvent `powerUsed` was accepted).
       */
      if (key === 'bomb') {
        const nextArmed = !armedBomb;
        setArmedBomb(nextArmed);
        emitArmBomb(nextArmed);
        return;
      }

      /**
       * Reshuffle = free action:
       * - do NOT decrement here
       * - engine decides acceptance and emits `powerUsed` => consume happens via bridge
       */
      if (key === 'extraShuffle') {
        playSfx('reshuffle');
        emitUsePower(key);
        return;
      }

      // Legacy behavior (until these powers are engine-owned)
      const prev = powers;
      const next: Powers = { ...powers, [key]: current - 1 };
      setPowers(next);

      if (!user) return;

      try {
        await updatePowers({ [key]: next[key] }, 'set');
      } catch {
        // rollback to render-state snapshot
        setPowers(prev);
      }
    },
    [armedBomb, emitArmBomb, emitUsePower, powers, setPowers, updatePowers, user],
  );

  const actions = useMemo(() => footerActions(openSettings, powers, onUsePower), [openSettings, powers, onUsePower]);

  return (
    <div className="flex flex-wrap justify-center gap-4 p-4 rounded-xl">
      {actions.map((item) => {
        const isBomb = item.id === 'bomb';
        const isActive = isBomb && armedBomb;

        const counted = isCounted(item);
        const canUse = counted ? item.count > 0 : true;
        const isDisabled = counted ? item.count <= 0 : false;

        const showCount = counted;
        const showBadge = !counted && typeof item.badge === 'string' && item.badge.length > 0;

        const iconPxActive = ICON_PX_ACTIVE_BY_ID[item.id] ?? DEFAULT_ICON_PX_ACTIVE;
        const iconPxInactive = iconPxActive - 1;
        const iconPx = isActive ? iconPxActive : iconPxInactive;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            aria-label={item.label}
            aria-pressed={isActive}
            disabled={isDisabled}
            data-footer-btn={item.id}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={[
              'relative w-26 h-20 flex items-center justify-center rounded-xl overflow-hidden select-none',
              'border border-white/15',
              'bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.05)_18%,rgba(0,0,0,0.38)_52%,rgba(255,255,255,0.08)_82%,rgba(0,0,0,0.55)_100%)]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_18px_rgba(0,0,0,0.55),0_10px_22px_rgba(0,0,0,0.35)]',
              "before:content-[''] before:absolute before:inset-0 before:rounded-xl before:pointer-events-none before:z-0",
              'before:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.055)_0px,rgba(255,255,255,0.055)_1px,rgba(0,0,0,0)_3px,rgba(0,0,0,0)_6px)]',
              'before:opacity-35',
              "after:content-[''] after:absolute after:inset-0 after:rounded-xl after:pointer-events-none after:z-0",
              'after:bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_34%,rgba(255,255,255,0)_68%)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60',
              isDisabled
                ? 'opacity-45 cursor-not-allowed'
                : 'transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:brightness-95',
              isActive ? 'ring-2 ring-rose-500/60 drop-shadow-[0_0_14px_rgba(244,63,94,0.28)]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
          >
            <img
              src={item.icon}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ width: iconPx, height: iconPx }}
              className={[
                'relative z-10 object-contain pointer-events-none select-none',
                isActive ? 'drop-shadow-[0_0_10px_rgba(244,63,94,0.35)]' : '',
                !canUse ? 'grayscale' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />

            {showCount && (
              <span className="absolute bottom-0 right-0 z-20 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20 text-xs text-white">
                {item.count}
              </span>
            )}

            {showBadge && (
              <span className="absolute bottom-0 right-0 z-20 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20">
                <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" draggable={false} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
