import { useEffect, useMemo, useRef, useState } from 'react';

import { footerActions } from './footerAction';
import { usePowers } from '@/context/PowerContext';
import { useAuth } from '@/context/AuthContext';
import type { PowerKey, Powers } from '@/types';

type Props = {
  openSettings: () => void;
};

type PowerArmDetail = { key: 'bomb'; armed: boolean };
type PowerUseAtDetail = { key: 'bomb'; index: number };
type PowerGrantDetail = { key: 'bomb'; delta: number };

export default function GameFooter({ openSettings }: Props) {
  const { powers, setPowers } = usePowers();
  const { user, updatePowers } = useAuth();

  const [armedBomb, setArmedBomb] = useState(false);

  // keep latest powers for event listeners (no re-bind storms)
  const powersRef = useRef<Powers>(powers);
  useEffect(() => {
    powersRef.current = powers;
  }, [powers]);

  // DEV: test start loadout => 5 bombs
  const didDevLoadoutRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (didDevLoadoutRef.current) return;
    didDevLoadoutRef.current = true;

    const cur = (powersRef.current.bomb ?? 0) | 0;
    if (cur >= 5) return;

    const next: Powers = { ...powersRef.current, bomb: 5 };
    setPowers(next);

    if (!user) return;
    updatePowers({ bomb: next.bomb }, 'set').catch(() => {
      // rollback if backend failed
      setPowers(powersRef.current);
    });
  }, [setPowers, user, updatePowers]);

  const emitArmBomb = (armed: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<PowerArmDetail>('match3:powerArm', { detail: { key: 'bomb', armed } }));
  };

  const consumeBomb = async () => {
    const current = (powersRef.current.bomb ?? 0) | 0;
    if (current <= 0) {
      setArmedBomb(false);
      emitArmBomb(false);
      return;
    }

    const next: Powers = { ...powersRef.current, bomb: current - 1 };
    setPowers(next);

    // if bombs reached 0, auto-disarm
    if ((next.bomb ?? 0) <= 0) {
      setArmedBomb(false);
      emitArmBomb(false);
    }

    if (!user) return;

    try {
      await updatePowers({ bomb: next.bomb }, 'set');
    } catch {
      // rollback if backend failed
      setPowers(powersRef.current);
    }
  };

  // Sync with global arm/disarm (Grid can disarm after confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;
      setArmedBomb(!!d.armed);
    };

    window.addEventListener('match3:powerArm', onArm as EventListener);
    return () => window.removeEventListener('match3:powerArm', onArm as EventListener);
  }, []);

  // Bomb confirm (Grid emits index) => spend 1 bomb
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUseAt = (e: Event) => {
      const ce = e as CustomEvent<PowerUseAtDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;
      void d.index;
      void consumeBomb();
    };

    window.addEventListener('match3:powerUseAt', onUseAt as EventListener);
    return () => window.removeEventListener('match3:powerUseAt', onUseAt as EventListener);
  }, [user, updatePowers, setPowers]);

  // Optional hook: later your PowerChoiceModal can dispatch this to grant +2 bombs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onGrant = (e: Event) => {
      const ce = e as CustomEvent<PowerGrantDetail>;
      const d = ce.detail;
      if (!d || d.key !== 'bomb') return;
      if (typeof d.delta !== 'number') return;

      const cur = (powersRef.current.bomb ?? 0) | 0;
      const next: Powers = { ...powersRef.current, bomb: cur + (d.delta | 0) };
      setPowers(next);

      if (!user) return;
      updatePowers({ bomb: next.bomb }, 'set').catch(() => {
        setPowers(powersRef.current);
      });
    };

    window.addEventListener('match3:powerGrant', onGrant as EventListener);
    return () => window.removeEventListener('match3:powerGrant', onGrant as EventListener);
  }, [setPowers, user, updatePowers]);

  const onUsePower = async (key: PowerKey) => {
    const current = (powersRef.current[key] ?? 0) | 0;
    if (current <= 0) return;

    // Bomb = targeting mode (no immediate spend)
    if (key === 'bomb') {
      const nextArmed = !armedBomb;
      setArmedBomb(nextArmed);
      emitArmBomb(nextArmed);
      return;
    }

    // others: immediate spend (existing behavior)
    const next: Powers = { ...powersRef.current, [key]: current - 1 };
    setPowers(next);

    if (!user) return;

    try {
      await updatePowers({ [key]: next[key] }, 'set');
    } catch {
      // rollback if backend failed
      setPowers(powersRef.current);
    }
  };

  const actions = useMemo(() => footerActions(openSettings, powers, onUsePower), [openSettings, powers]);

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
            <img src={item.icon} alt={item.label} className="w-8 h-8" />
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
