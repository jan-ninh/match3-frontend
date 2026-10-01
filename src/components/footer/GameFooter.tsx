import { useOverlays } from '@/features/overlays';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { footerActions } from './footerAction';
import { usePowers } from '@/context/PowerContext';
import { POWER_ARM_EVENT, POWER_USE_EVENT, type PowerArmDetail, type PowerUseDetail } from '@/context/powerEvents';
import { playSfx } from '@/features/audio';
import type { PowerKey, Powers } from '@/types';
import { NeonFooterButton } from '@/components';
import { MATCH3_LEVEL_CHANGED_EVENT, getRuntimeLevelId, type Match3LevelChangedDetail } from '@/context/levelRuntime';
import { MATCH3_INPUT_LOCK_CHANGED_EVENT, getRuntimeInputLocked, type Match3InputLockChangedDetail } from '@/context/inputLockRuntime';
import { isLaserRowMatch4TrainingStage } from '@/gamelogic/scenarios/policies';

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
  const { openQuitConfirm } = useOverlays();
  const { powers } = usePowers();

  const [armedGridlaser, setArmedGridlaser] = useState(false);
  const [armedLaser, setArmedLaser] = useState(false);

  // Runtime input lock mirror (engine-owned). Used to disable all footer actions.
  const [runtimeInputLocked, setRuntimeInputLockedState] = useState<boolean>(() => getRuntimeInputLocked());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLock = (e: Event) => {
      const ce = e as CustomEvent<Match3InputLockChangedDetail>;
      const locked = !!ce.detail?.inputLocked;
      setRuntimeInputLockedState(locked);
    };

    window.addEventListener(MATCH3_INPUT_LOCK_CHANGED_EVENT, onLock as EventListener);
    return () => window.removeEventListener(MATCH3_INPUT_LOCK_CHANGED_EVENT, onLock as EventListener);
  }, []);

  // Runtime level mirror (engine-owned). Used for UI-only policies.
  const [runtimeLevelId, setRuntimeLevelIdState] = useState<number | null>(() => getRuntimeLevelId());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLevelChanged = (e: Event) => {
      const ce = e as CustomEvent<Match3LevelChangedDetail>;
      const id = ce.detail?.levelId;
      if (typeof id !== 'number' || !Number.isFinite(id)) return;
      setRuntimeLevelIdState(id | 0);
    };

    window.addEventListener(MATCH3_LEVEL_CHANGED_EVENT, onLevelChanged as EventListener);
    return () => window.removeEventListener(MATCH3_LEVEL_CHANGED_EVENT, onLevelChanged as EventListener);
  }, []);

  const isInfiniteItemsLevel = isLaserRowMatch4TrainingStage(runtimeLevelId);

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

  // Safety: input lock => disarm targeting (prevents UI showing aim mode while locked)
  useEffect(() => {
    if (!runtimeInputLocked) return;
    disarmAllTargeting();
  }, [runtimeInputLocked, disarmAllTargeting]);

  // Safety: if count hits 0 while armed, disarm (prevents "stuck targeting")
  useEffect(() => {
    if (isInfiniteItemsLevel) return;

    const cur = getPowerCount(powers, 'gridlaser');
    if (cur > 0) return;
    if (!armedGridlaser) return;

    setArmedGridlaser(false);
    emitArmPower('gridlaser', false);
  }, [armedGridlaser, emitArmPower, isInfiniteItemsLevel, powers]);

  useEffect(() => {
    if (isInfiniteItemsLevel) return;

    const cur = getPowerCount(powers, 'laser');
    if (cur > 0) return;
    if (!armedLaser) return;

    setArmedLaser(false);
    emitArmPower('laser', false);
  }, [armedLaser, emitArmPower, isInfiniteItemsLevel, powers]);

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

  const onUsePower = useCallback(
    async (key: PowerKey) => {
      if (runtimeInputLocked) return;

      const targetingKey = normalizeTargetingKey(key);

      const current = isInfiniteItemsLevel ? 1 : getPowerCount(powers, key);
      if (!isInfiniteItemsLevel && current <= 0) {
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

      // All supported powers are engine-owned; no direct inventory mutation.
    },
    [armedGridlaser, armedLaser, disarmAllTargeting, emitArmPower, emitUsePower, isInfiniteItemsLevel, powers, runtimeInputLocked],
  );

  const actions = useMemo<FooterActionItem[]>(() => {
    return footerActions(noopOpenSettings, powers, onUsePower).filter((a) => a.id !== 'settings');
  }, [powers, onUsePower]);

  return (
    <div className="gameplay-footer flex flex-nowrap justify-center gap-3 p-3 mb-2">
      {actions.map((item) => {
        // Robust: derive power identity from `item.id` (footerActions can drift / aliases).
        const powerKey = footerIdToPowerKey(item.id);

        const isGridlaser = powerKey === 'gridlaser';
        const isLaser = powerKey === 'laser';
        const isActive = (isGridlaser && armedGridlaser) || (isLaser && armedLaser);

        const isInfinite = isInfiniteItemsLevel && powerKey != null;

        const powerCount = powerKey ? getPowerCount(powers, powerKey) : null;

        const counted = isCounted(item);
        const countToShow = isInfinite ? null : powerCount != null ? powerCount : counted ? item.count : null;

        const canUse = isInfinite ? true : countToShow != null ? countToShow > 0 : true;
        const isDisabledByCount = isInfinite ? false : countToShow != null ? countToShow <= 0 : false;
        const isDisabled = isDisabledByCount || runtimeInputLocked;

        const showBadge = countToShow == null && !counted && typeof item.badge === 'string' && item.badge.length > 0;

        const iconPxActive = ICON_PX_ACTIVE_BY_ID[item.id] ?? DEFAULT_ICON_PX_ACTIVE;
        const iconPxInactive = iconPxActive - 1;
        const iconPx = isActive ? iconPxActive : iconPxInactive;

        const badge = isInfinite ? (
          <span aria-label="Infinite" title="Infinite">
            ∞
          </span>
        ) : countToShow != null ? (
          <span>{countToShow}</span>
        ) : showBadge ? (
          <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" draggable={false} />
        ) : null;

        const onClick = () => {
          if (runtimeInputLocked) return;

          if (powerKey) {
            void onUsePower(powerKey);
            return;
          }
          if (item.id === 'button4') openQuitConfirm();
          else item.onClick();
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
