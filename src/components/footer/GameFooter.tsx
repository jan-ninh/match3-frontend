// src/components/footer/GameFooter.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGetGameStatus } from '@/api/game';
import { footerActions } from './footerAction';
import bombSprite from '@/assets/items/bomb01.png';
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

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const status = await apiGetGameStatus(user.id);
        if (status?.powers) {
          setPowers(status.powers);
        }
      } catch (err) {
        console.error('Failed to load game status:', err);
      }
    })();
  }, [user?.id, setPowers]);

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

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            aria-label={item.label}
            aria-pressed={isActive}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={[
              'relative w-24 h-16 flex items-center justify-center border border-white/20 hover:scale-105 transition focus:outline-none focus:ring select-none',
              isActive ? 'ring-2 ring-rose-500/60 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : '',
            ].join(' ')}
            type="button"
          >
            <img
              src={isBomb ? bombSprite : item.icon}
              alt=""
              aria-hidden="true"
              draggable={false}
              className={['object-contain pointer-events-none select-none', isBomb ? 'w-80 h-80 pb-5' : 'w-8 h-8'].join(' ')}
            />
            {typeof item.count === 'number' && (
              <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20 text-xs text-white">
                {item.count}
              </span>
            )}
            {!item.count && item.badge && (
              <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20">
                <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" draggable={false} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
