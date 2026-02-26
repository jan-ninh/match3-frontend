// src/features/grid/ui/tileStyles/keycardTileFx.ts
export const TILE_BASE_SHADOW_CLASS = 'shadow-[0_6px_16px_rgba(0,0,0,0.35)]';

export const KEYCARD_BASE_SHADOW_CLASS =
  'shadow-[0_6px_16px_rgba(0,0,0,0.35),0_0_12px_rgba(251,191,36,0.25)]';

export const KEYCARD_FALLBACK_STYLE = {
  background: 'linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.5) 100%)',
  border: '2px solid rgba(251,191,36,0.5)',
} as const;
