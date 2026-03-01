// src/features/devtools-host/lib/powers/rewardMath.ts
import type { Powers } from '@/types';

import type { BackendRewardPowerId } from './rewardMapping';

function safeInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n | 0;
}

export function addReward(base: Powers, powerId: BackendRewardPowerId, amount: number): Powers {
  const add = safeInt(amount);
  if (powerId === 'bomb') return { ...base, bomb: (base.bomb ?? 0) + add };
  if (powerId === 'laser') return { ...base, laser: (base.laser ?? 0) + add };
  return { ...base, extraShuffle: (base.extraShuffle ?? 0) + add };
}

export function buildRewardDelta(powerId: BackendRewardPowerId, amount: number): Partial<Powers> {
  const add = safeInt(amount);
  if (powerId === 'bomb') return { bomb: add };
  if (powerId === 'laser') return { laser: add };
  return { extraShuffle: add };
}

export function buildRewardAbsolute(powerId: BackendRewardPowerId, next: Powers): Partial<Powers> {
  if (powerId === 'bomb') return { bomb: safeInt(next.bomb ?? 0) };
  if (powerId === 'laser') return { laser: safeInt(next.laser ?? 0) };
  return { extraShuffle: safeInt(next.extraShuffle ?? 0) };
}
