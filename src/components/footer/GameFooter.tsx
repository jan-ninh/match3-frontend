import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { footerActions } from './footerAction';
import bombSprite from '@/assets/items/bomb01.png';
import { usePowers } from '@/context/PowerContext';
import { useAuth } from '@/context/AuthContext';
import { POWER_ARM_EVENT, POWER_GRANT_EVENT, type PowerArmDetail, type PowerGrantDetail } from '@/context/powerEvents';
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

  const emitArmBomb = useCallback((armed: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed } }));
  }, []);

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
   * Source of truth for consumption is PowerProvider via POWER_CONSUME_EVENT.
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
       * (dispatched by the engine-event bridge after EngineEvent `powerUsed` was accepted).
       */
      if (key === 'bomb') {
        const nextArmed = !armedBomb;
        setArmedBomb(nextArmed);
        emitArmBomb(nextArmed);
        return;
      }

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
    [armedBomb, emitArmBomb, powers, setPowers, updatePowers, user],
  );

  const actions = useMemo(() => footerActions(openSettings, powers, onUsePower), [openSettings, powers, onUsePower]);

  return (
    <div className="flex flex-wrap justify-center gap-4 p-4 rounded-xl">
      {actions.map((item) => {
        const isBomb = item.id === ('bomb' as PowerKey);
        const isActive = isBomb && armedBomb;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            aria-label={item.label}
            aria-pressed={isActive}
            className={[
              'relative w-24 h-16 flex items-center justify-center border border-white/20 hover:scale-105 transition focus:outline-none focus:ring',
              isActive ? 'ring-2 ring-rose-500/60 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : '',
            ].join(' ')}
            type="button"
          >
            <img src={isBomb ? bombSprite : item.icon} alt={item.label} className={['object-contain', isBomb ? 'w-80 h-80 pb-5' : 'w-8 h-8'].join(' ')} />
            {typeof item.count === 'number' && (
              <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20 text-xs text-white">
                {item.count}
              </span>
            )}
            {!item.count && item.badge && (
              <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20">
                <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
