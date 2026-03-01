// src/features/devtools-host/lib/outcome/playerMeta.ts
import type { UserProfile } from '@/types';

export type PlayerMeta = { playerLevel: number; playerExp: number };

export function readPlayerMeta(p: UserProfile | null | undefined): PlayerMeta | null {
  if (!p) return null;

  const lvlRaw = p.playerLevel;
  const expRaw = p.playerExp;

  const playerLevel = Number.isFinite(lvlRaw) ? Math.max(1, Math.floor(lvlRaw)) : 1;
  const playerExp = Number.isFinite(expRaw) ? Math.max(0, Math.floor(expRaw)) : 0;

  return { playerLevel, playerExp };
}
