import { SWAP_MS } from '@/gamelogic';

// Sizing
export const TILE_SIZE = 60; // 56
export const GAP = 2; // tailwind gap-2 => 0.5rem => 8px
export const BOARD_PADDING = 12; // p-3 => 12px
export const tileDist = TILE_SIZE + GAP;

// Drag threshold
export const DRAG_THRESHOLD = 6; // px

// Axis-lock policy
export const LOCK_THRESHOLD = 12; // px additional movement needed to decide axis
export const LOCK_DOMINANCE = 1.2; // axis must dominate by this factor to lock
export const RELOCK_DOMINANCE = 1.35; // stricter dominance needed to switch axis once locked

// Preview (visual "swap" latch)
export const PREVIEW_LOCK_RATIO = 0.55; // >= 55% into the neighbor => latch preview
export const PREVIEW_RELEASE_RATIO = 0.35; // go back below this => unlatch (hysteresis)
export const PREVIEW_MS = 120;

// Movement smoothing (exponential smoothing / lerp)
//
// smoothed = smoothed + (desired - smoothed) * SMOOTHING
// - 0.0 = frozen
// - 1.0 = no smoothing (instant)
//
// Pick ~0.25..0.45 depending on how "direct" you want it.
export const SMOOTHING = 0.35;

// Swap animation (single source of truth in gamelogic)
export { SWAP_MS };
export const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Dev panel
export const DEBUG_OVERLAY_HZ = 15;
