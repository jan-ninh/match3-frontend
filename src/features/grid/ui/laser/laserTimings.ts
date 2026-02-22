/**
 * Laser timings (UI bridge).
 *
 * Goal:
 * - SFX should play immediately on confirm (in the same user gesture tick).
 * - Engine dispatch should be delayed to control when the board effect starts.
 *
 * Units: milliseconds.
 */
export const LASER_ENGINE_DELAY_MS = 650;

// -----------------------------
// Laser SFX timing knobs (UI-only)
// -----------------------------

// Targeting "tick" cooldown (ms):
// - 0 => play on every row change (can spam/overlap)
// - >0 => rate-limited; tweak for feel
export const LASER_TARGETING_SFX_COOLDOWN_MS = 110;

// Optional: delay confirm sound to sync with beam FX (default 0 = instant).
export const LASER_CONFIRM_SFX_DELAY_MS = 0;

// -----------------------------
// 3x3gridlaser targeting SFX (UI-only)
// -----------------------------
//
// Assumption: "3x3gridlaser" uses the existing 3×3 targeting hook (currently named bomb).
// This plays the SAME targeting asset as the row-laser (laser_targeting.mp3) when the 3×3 target changes.
// No confirm sound here by request.
export const GRIDLASER_3X3_TARGETING_SFX_COOLDOWN_MS = 130;

// -----------------------------
// Laser strike FX timing knobs
// -----------------------------
//
// A) FX start delay (ms): when the blue beam becomes visible AFTER the confirm click
// C) FX lifetime (ms): how long the beam stays visible AFTER it becomes visible
//
// NOTE: Keep LaserRowStrikeFxLayer's internal duration roughly in sync with LIFE_MS
// if you want a clean "ends when removed" feel.
export const LASER_STRIKE_FX_START_DELAY_MS = 620;
export const LASER_STRIKE_FX_LIFE_MS = 420;
