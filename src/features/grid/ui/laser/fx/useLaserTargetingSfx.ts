import { useCallback } from 'react';
import { playSfx } from '@/features/audio';
import { useTargetingTickSfx } from '@/features/grid/ui/fx/useTargetingTickSfx';

type Options = Readonly<{
  armed: boolean;
  hoverRow: number | null;
  /**
   * Minimum time (ms) between targeting "tick" sounds.
   * - 0 => play on every row change (can spam/overlap)
   * - >0 => rate-limited; fast mouse movement still produces a controlled cadence
   */
  cooldownMs: number;
  /**
   * Optional delay (ms) before confirm sound fires (useful to sync with beam FX).
   */
  confirmDelayMs?: number;
}>;

type Api = Readonly<{
  playConfirm: () => void;
}>;

/**
 * UI-only Laser SFX orchestrator:
 * - targeting: plays when hoverRow changes while armed (rate-limited via cooldownMs)
 * - confirm: plays on user confirm click (optional delay)
 */
export function useLaserTargetingSfx({ armed, hoverRow, cooldownMs, confirmDelayMs = 0 }: Options): Api {
  useTargetingTickSfx({
    armed,
    targetKey: hoverRow,
    cooldownMs,
    sfxId: 'laserTargeting',
  });

  const playConfirm = useCallback(() => {
    if (typeof window === 'undefined') return;

    const delay = Math.max(0, confirmDelayMs);
    if (delay === 0) {
      playSfx('laserConfirm');
      return;
    }

    window.setTimeout(() => {
      playSfx('laserConfirm');
    }, delay);
  }, [confirmDelayMs]);

  return { playConfirm };
}
