// src/components/footer/GameFooter.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGetGameStatus } from '@/api/game';
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
import { NeonFooterButton } from '@/components';

type FooterActionItem = ReturnType<typeof footerActions>[number];

type ArmedKey = Extract<PowerKey, 'bomb' | 'laser'>;

const DEFAULT_ICON_PX_ACTIVE = 60;

// Set numbers for each Button
const ICON_PX_ACTIVE_BOMB = 65;
const ICON_PX_ACTIVE_LASER = 80;
const ICON_PX_ACTIVE_RESHUFFLE = 60;
const ICON_PX_ACTIVE_ITEM4 = 60;

const noopOpenSettings = (): void => undefined;

/**
 * Per-button icon sizing (active).
 * - Add entries by `item.id` (string).
 * - Missing ids fall back to DEFAULT_ICON_PX_ACTIVE.
 */
const ICON_PX_ACTIVE_BY_ID: Readonly<Partial<Record<string, number>>> = {
  bomb: ICON_PX_ACTIVE_BOMB,

  // Laser aliases (see footerIdToPowerKey)
  laser: ICON_PX_ACTIVE_LASER,
  gridlaser: ICON_PX_ACTIVE_LASER,
  laserRow: ICON_PX_ACTIVE_LASER,
  laserRowClear: ICON_PX_ACTIVE_LASER,

  reshuffle: ICON_PX_ACTIVE_RESHUFFLE,
  extraShuffle: ICON_PX_ACTIVE_RESHUFFLE, // alias: current PowerKey id

  item4: ICON_PX_ACTIVE_ITEM4,
};

function isCounted(item: FooterActionItem): item is FooterActionItem & { count: number } {
  return typeof item.count === 'number';
}

function footerIdToPowerKey(id: FooterActionItem['id']): PowerKey | null {
  const idStr = String(id);

  if (idStr === 'bomb') return 'bomb';

  // Laser button has historically drifted across ids (asset: gridlaser.png, etc.).
  // Treat known aliases as the same PowerKey.
  if (idStr === 'laser' || idStr === 'gridlaser' || idStr === 'laserRow' || idStr === 'laserRowClear') return 'laser';

  // Some UIs still call the button "reshuffle" while the PowerKey is "extraShuffle".
  if (idStr === 'extraShuffle' || idStr === 'reshuffle') return 'extraShuffle';

  return null;
}

function allocFooterRequestId(): number {
  // RequestIds are only used for UI idempotence (consume-ack). Any monotonic id is fine.
  // Use a shared `window` slot so different emitters don't collide.
  if (typeof window === 'undefined') return 1;
  const w = window as unknown as { __match3PowerRequestId?: number };
  const cur = (w.__match3PowerRequestId ?? 1) | 0;
  const next = (cur + 1) | 0;
  w.__match3PowerRequestId = next <= 0 ? 1 : next;
  return cur <= 0 ? 1 : cur;
}

export default function GameFooter() {
  const { powers, setPowers } = usePowers();
  const { user, updatePowers } = useAuth();

  const [armedBomb, setArmedBomb] = useState(false);
  const [armedLaser, setArmedLaser] = useState(false);

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

  const emitArmPower = useCallback((key: ArmedKey, armed: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key, armed } }));
  }, []);

  const emitUsePower = useCallback((key: PowerKey) => {
    if (typeof window === 'undefined') return;
    const requestId = allocFooterRequestId();
    window.dispatchEvent(new CustomEvent<PowerUseDetail>(POWER_USE_EVENT, { detail: { key, requestId } }));
  }, []);

  const disarmAllTargeting = useCallback(() => {
    if (armedBomb) {
      setArmedBomb(false);
      emitArmPower('bomb', false);
    }
    if (armedLaser) {
      setArmedLaser(false);
      emitArmPower('laser', false);
    }
  }, [armedBomb, armedLaser, emitArmPower]);

  // Safety: if count hits 0 while armed, disarm (prevents "stuck targeting")
  useEffect(() => {
    const cur = (powers.bomb ?? 0) | 0;
    if (cur > 0) return;
    if (!armedBomb) return;

    setArmedBomb(false);
    emitArmPower('bomb', false);
  }, [armedBomb, emitArmPower, powers.bomb]);

  useEffect(() => {
    const cur = (powers.laser ?? 0) | 0;
    if (cur > 0) return;
    if (!armedLaser) return;

    setArmedLaser(false);
    emitArmPower('laser', false);
  }, [armedLaser, emitArmPower, powers.laser]);

  // Sync with global arm/disarm (Grid can disarm after confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d) return;

      if (d.key === 'bomb') setArmedBomb(!!d.armed);
      if (d.key === 'laser') setArmedLaser(!!d.armed);
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

      powersRef.current = next;
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
   * Apply ack-driven consumption locally + best-effort persist.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsume = (e: Event) => {
      const ce = e as CustomEvent<PowerConsumeDetail>;
      const d = ce.detail;
      if (!d) return;

      const amount = d.amount | 0;
      if (amount <= 0) return;

      const key = d.key;

      const cur = (powersRef.current[key] ?? 0) | 0;
      const nextVal = Math.max(0, cur - amount);
      if (nextVal === cur) return;

      const next: Powers = { ...powersRef.current, [key]: nextVal };
      powersRef.current = next;
      setPowers(next);

      if (!user) return;

      updatePowers({ [key]: nextVal }, 'set').catch(() => {
        // Best-effort: local UI already consumed; backend sync can be retried later.
      });
    };

    window.addEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
    return () => window.removeEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
  }, [setPowers, updatePowers, user]);

  const onUsePower = useCallback(
    async (key: PowerKey) => {
      const current = (powers[key] ?? 0) | 0;
      if (current <= 0) {
        // If user tries to arm with 0, make sure it's off
        if (key === 'bomb' || key === 'laser') disarmAllTargeting();
        return;
      }

      /**
       * Targeting powers (bomb + laser) = arm/disarm only.
       * Inventory spend is applied by POWER_CONSUME_EVENT (engine ack).
       */
      if (key === 'bomb') {
        if (armedLaser) {
          setArmedLaser(false);
          emitArmPower('laser', false);
        }
        const nextArmed = !armedBomb;
        setArmedBomb(nextArmed);
        emitArmPower('bomb', nextArmed);
        return;
      }

      if (key === 'laser') {
        if (armedBomb) {
          setArmedBomb(false);
          emitArmPower('bomb', false);
        }
        const nextArmed = !armedLaser;
        setArmedLaser(nextArmed);
        emitArmPower('laser', nextArmed);
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
    [armedBomb, armedLaser, disarmAllTargeting, emitArmPower, e        const powerKey = footerIdToPowerKey(item.id);

        const isBomb = powerKey === 'bomb';
        const isLaser = powerKey === 'laser';
        const isActive = (isBomb && armedBomb) || (isLaser && armedLaser);

        // Derive count/disabled from `powers` ONLY when this key exists in the current build.
        // If `powers[powerKey]` is missing/undefined (type drift), fall back to footerActions' own count.
        const rawCount = powerKey ? powers[powerKey] : undefined;
        const powerCount = typeof rawCount === 'number' ? (rawCount | 0) : null;

b';
        const isLaser = item.id === 'laser';
        const isActive = (isBomb && armedBomb) || (isLaser && armedLaser);

        // Robust: derive count/disabled from `powers` for known power-ids (footerActions can drift).
        const powerKey = footerIdToPowerKey(item.id);
        const powerCount = powerKey ? ((powers[powerKey] ?? 0) | 0) : null;

        const counted = isCounted(item);
        const countToShow = powerCount != null ? powerCount : counted ? item.count : null;

        const canUse = countToShow != null ? countToShow > 0 : true;
        const isDisabled = countToShow != null ? countToShow <= 0 : false;

        const showBadge = countToShow == null && !counted && typeof item.badge === 'string' && item.badge.length > 0;

        const iconPxActive = ICON_PX_ACTIVE_BY_ID[item.id] ?? DEFAULT_ICON_PX_ACTIVE;
        const iconPxInactive = iconPxActive - 1;
        const iconPx = isActive ? iconPxActive : iconPxInactive;

        const badge = countToShow != null ? (
          <span>{countToShow}</span>
        ) : showBadge ? (
          <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" draggable={false} />
        ) : null;

        const onClick = () => {
          if (powerKey) {
            void onUsePower(powerKey);
            return;
          }
          item.onClick();
        };

        return (
          <NeonFooterButton
            key={item.id}
            onClick={onClick}
            aria-label={item.label}
            disabled={isDisabled}
            active={isActive}
            data-footer-btn={item.id}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            badge={badge}
          >
            <img
              src={item.icon}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ width: iconPx, height: iconPx, maxWidth: '100%', maxHeight: '100%' }}
              className={[
                'relative z-10 object-contain pointer-events-none select-none',
                isActive ? 'drop-shadow-[0_0_10px_rgba(244,63,94,0.35)]' : '',
                !canUse ? 'grayscale' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </NeonFooterButton>
        );
      })}
    </div>
  );
}
