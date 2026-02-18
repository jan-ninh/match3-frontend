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

type TargetingKey = Extract<PowerKey, 'gridlaser' | 'laser'>;

const DEFAULT_ICON_PX_ACTIVE = 80;

// Set numbers for each Button
const ICON_PX_ACTIVE_GRIDLASER = 65;
const ICON_PX_ACTIVE_LASER = 80;
const ICON_PX_ACTIVE_RESHUFFLE = 60;
const ICON_PX_ACTIVE_ITEM4 = 90;

const noopOpenSettings = (): void => undefined;

/**
 * Per-button icon sizing (active).
 * - Add entries by `item.id` (string).
 * - Missing ids fall back to DEFAULT_ICON_PX_ACTIVE.
 */
const ICON_PX_ACTIVE_BY_ID: Readonly<Partial<Record<string, number>>> = {
  // canonical ids
  gridlaser: ICON_PX_ACTIVE_GRIDLASER,
  laser: ICON_PX_ACTIVE_LASER,

  // legacy aliases (configs/assets drift)
  bomb: ICON_PX_ACTIVE_GRIDLASER,
  laserRow: ICON_PX_ACTIVE_LASER,
  laserRowClear: ICON_PX_ACTIVE_LASER,

  reshuffle: ICON_PX_ACTIVE_RESHUFFLE,
  extraShuffle: ICON_PX_ACTIVE_RESHUFFLE, // alias: current PowerKey id
  item4: ICON_PX_ACTIVE_ITEM4,
};

function isCounted(item: FooterActionItem): item is FooterActionItem & { count: number } {
  return typeof item.count === 'number';
}

function normalizeTargetingKey(key: PowerKey): TargetingKey | null {
  if (key === 'gridlaser' || key === 'laser') return key;
  // Compatibility: older builds may still emit/use "bomb" as the legacy key for gridlaser.
  if (key === 'bomb') return 'gridlaser';
  return null;
}

function getPowerCount(powers: Powers, key: PowerKey): number {
  if (key === 'gridlaser') return (powers.gridlaser ?? powers.bomb ?? 0) | 0;
  if (key === 'bomb') return (powers.bomb ?? powers.gridlaser ?? 0) | 0;
  return (powers[key] ?? 0) | 0;
}

function footerIdToPowerKey(id: FooterActionItem['id']): PowerKey | null {
  const idStr = String(id);

  // IMPORTANT: "gridlaser" (old bomb refactor) and "laser" (row clear) are two different powers.
  // Keep aliases mapped to the correct canonical keys.
  if (idStr === 'gridlaser' || idStr === 'laser') return idStr as PowerKey;

  // Legacy ids:
  if (idStr === 'bomb') return 'gridlaser';
  if (idStr === 'laserRow' || idStr === 'laserRowClear') return 'laser';

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

  const [armedGridlaser, setArmedGridlaser] = useState(false);
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

  const emitArmPower = useCallback((key: TargetingKey, armed: boolean) => {
    if (typeof window === 'undefined') return;

    // Canonical emit
    window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key, armed } }));

    // Compatibility: older listeners still subscribe to "bomb" for the old gridlaser power.
    if (key === 'gridlaser') {
      window.dispatchEvent(new CustomEvent<PowerArmDetail>(POWER_ARM_EVENT, { detail: { key: 'bomb', armed } }));
    }
  }, []);

  const emitUsePower = useCallback((key: PowerKey) => {
    if (typeof window === 'undefined') return;
    const requestId = allocFooterRequestId();
    window.dispatchEvent(new CustomEvent<PowerUseDetail>(POWER_USE_EVENT, { detail: { key, requestId } }));
  }, []);

  const disarmAllTargeting = useCallback(() => {
    if (armedGridlaser) {
      setArmedGridlaser(false);
      emitArmPower('gridlaser', false);
    }
    if (armedLaser) {
      setArmedLaser(false);
      emitArmPower('laser', false);
    }
  }, [armedGridlaser, armedLaser, emitArmPower]);

  // Safety: if count hits 0 while armed, disarm (prevents "stuck targeting")
  useEffect(() => {
    const cur = getPowerCount(powers, 'gridlaser');
    if (cur > 0) return;
    if (!armedGridlaser) return;

    setArmedGridlaser(false);
    emitArmPower('gridlaser', false);
  }, [armedGridlaser, emitArmPower, powers]);

  useEffect(() => {
    const cur = getPowerCount(powers, 'laser');
    if (cur > 0) return;
    if (!armedLaser) return;

    setArmedLaser(false);
    emitArmPower('laser', false);
  }, [armedLaser, emitArmPower, powers]);

  // Sync with global arm/disarm (Grid can disarm after confirm)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<PowerArmDetail>;
      const d = ce.detail;
      if (!d) return;

      // Accept both canonical and legacy key for the old gridlaser power.
      if (d.key === 'gridlaser' || d.key === 'bomb') setArmedGridlaser(!!d.armed);
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

      const cur = getPowerCount(powersRef.current, d.key);
      const nextVal = cur + delta;
      const next: Powers = { ...powersRef.current, [d.key]: nextVal };

      // Keep legacy alias in sync when granting gridlaser/bomb.
      if (d.key === 'gridlaser') next.bomb = next.gridlaser;
      if (d.key === 'bomb') next.gridlaser = next.bomb;

      powersRef.current = next;
      setPowers(next);

      if (!user) return;

      updatePowers({ [d.key]: nextVal }, 'set').catch(() => {
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
      const cur = getPowerCount(powersRef.current, key);
      const nextVal = Math.max(0, cur - amount);
      if (nextVal === cur) return;

      const next: Powers = { ...powersRef.current, [key]: nextVal };

      // Keep legacy alias in sync when consuming gridlaser/bomb.
      if (key === 'gridlaser') next.bomb = nextVal;
      if (key === 'bomb') next.gridlaser = nextVal;

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
      const targetingKey = normalizeTargetingKey(key);

      const current = getPowerCount(powers, key);
      if (current <= 0) {
        // If user tries to arm with 0, make sure it's off
        if (targetingKey) disarmAllTargeting();
        return;
      }

      /**
       * Targeting powers (gridlaser + laser) = arm/disarm only.
       * Inventory spend is applied by POWER_CONSUME_EVENT (engine ack).
       */
      if (targetingKey === 'gridlaser') {
        if (armedLaser) {
          setArmedLaser(false);
          emitArmPower('laser', false);
        }
        const nextArmed = !armedGridlaser;
        setArmedGridlaser(nextArmed);
        emitArmPower('gridlaser', nextArmed);
        return;
      }

      if (targetingKey === 'laser') {
        if (armedGridlaser) {
          setArmedGridlaser(false);
          emitArmPower('gridlaser', false);
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
      const nextVal = current - 1;
      const next: Powers = { ...powers, [key]: nextVal };
      setPowers(next);

      if (!user) return;

      try {
        const nextVal = current - 1;
        await updatePowers({ [key]: nextVal }, 'set');
      } catch {
        // rollback to render-state snapshot
        setPowers(prev);
      }
    },
    [armedGridlaser, armedLaser, disarmAllTargeting, emitArmPower, emitUsePower, powers, setPowers, updatePowers, user],
  );

  const actions = useMemo<FooterActionItem[]>(() => {
    return footerActions(noopOpenSettings, powers, onUsePower).filter((a) => a.id !== 'settings');
  }, [powers, onUsePower]);

  return (
    <div className="flex flex-nowrap justify-center gap-8 p-3 mb-6 ]">
      {actions.map((item) => {
        // Robust: derive power identity from `item.id` (footerActions can drift / aliases).
        const powerKey = footerIdToPowerKey(item.id);

        const isGridlaser = powerKey === 'gridlaser';
        const isLaser = powerKey === 'laser';
        const isActive = (isGridlaser && armedGridlaser) || (isLaser && armedLaser);

        const powerCount = powerKey ? getPowerCount(powers, powerKey) : null;

        const counted = isCounted(item);
        const countToShow = powerCount != null ? powerCount : counted ? item.count : null;

        const canUse = countToShow != null ? countToShow > 0 : true;
        const isDisabled = countToShow != null ? countToShow <= 0 : false;

        const showBadge = countToShow == null && !counted && typeof item.badge === 'string' && item.badge.length > 0;

        const iconPxActive = ICON_PX_ACTIVE_BY_ID[item.id] ?? DEFAULT_ICON_PX_ACTIVE;
        const iconPxInactive = iconPxActive - 1;
        const iconPx = isActive ? iconPxActive : iconPxInactive;

        const badge =
          countToShow != null ? (
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
