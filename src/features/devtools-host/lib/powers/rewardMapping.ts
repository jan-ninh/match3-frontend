// src/features/devtools-host/lib/powers/rewardMapping.ts
import type { PowerKey } from '@/types';

export type BackendRewardPowerId = Extract<PowerKey, 'bomb' | 'laser' | 'extraShuffle'>;

export function toBackendRewardPowerId(v: unknown): BackendRewardPowerId | null {
  if (v === 'bomb' || v === 'laser' || v === 'extraShuffle') return v;
  // UI alias (newer overlay): gridlaser reward should map to backend bomb inventory.
  if (v === 'gridlaser') return 'bomb';
  return null;
}

export function toBackendPowerKey(key: unknown): PowerKey | null {
  if (key === 'bomb' || key === 'laser' || key === 'extraShuffle') return key;
  // Legacy alias: old UI used "gridlaser" for the bomb-like 3x3 item.
  if (key === 'gridlaser') return 'bomb';
  return null;
}
