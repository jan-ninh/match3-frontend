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
// Row target overlay timings (UI-only)
// -----------------------------

// When the row-laser is CONFIRMED, keep the last target row visible and fade it out.
// This is intentionally separate from the normal "hover leave" fade window.
export const LASER_CONFIRM_ROW_FADE_OUT_MS = 900;

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

// -----------------------------
// Laser strike multi-pulse sequence (UI-only)
// -----------------------------
//
// The strike FX can play multiple pulses for a "stuttering / multi-hit" feel.
// Each pulse can have:
// - Its own life (visibility window)
// - A gap AFTER it ends before the next pulse starts
// - Its own visual knobs (opacity, thickness, etc.)
//
// Example "intervals" request:
//   gaps: 20ms, then 10ms, then 5ms  => 4 pulses total
//   (gapAfterMs is the waiting time AFTER a pulse ends)
//
// You can freely tweak this list to shape the feel.
export type LaserStrikePulseSpec = Readonly<{
  /** Delay AFTER this pulse ends before the next pulse starts. (last pulse ignores it) */
  gapAfterMs?: number;

  /** Visibility window for this pulse (ms). */
  lifeMs?: number;

  /** Peak opacity of the whole pulse (0..1). */
  peakOpacity?: number;

  /** Band thickness animation (scaleY). */
  bandScaleYFrom?: number;
  bandScaleYPeak?: number;
  bandScaleYEnd?: number;

  /** Beam core thickness (% of row height). */
  coreHeightPct?: number;

  /** Peak opacity of the beam core (0..1). */
  corePeakOpacity?: number;

  /** Beam core thickness animation (scaleY). */
  coreScaleYFrom?: number;
  coreScaleYPeak?: number;
  coreScaleYEnd?: number;

  /** Grain/noise opacity (0..1). */
  noiseOpacity?: number;

  /** Scan streak (fast left->right) */
  scanEnabled?: boolean;
  scanDurationMs?: number;
  scanWidthPct?: number;
}>;

export const LASER_STRIKE_PULSE_SEQUENCE: readonly LaserStrikePulseSpec[] = [
  // Pulse 1 (strong)
  {
    lifeMs: 200,
    gapAfterMs: 5,
    peakOpacity: 1,
    coreHeightPct: 22,
    scanEnabled: true,
  },
  // Pulse 2
  {
    lifeMs: 140,
    gapAfterMs: 2,
    peakOpacity: 0.78,
    coreHeightPct: 20,
    scanEnabled: false,
  },
  // Pulse 3
  {
    lifeMs: 90,
    gapAfterMs: 1,
    peakOpacity: 0.62,
    coreHeightPct: 18,
    scanEnabled: false,
  },
  // Pulse 4 (tail)
  {
    lifeMs: 10,
    peakOpacity: 0.5,
    coreHeightPct: 16,
    scanEnabled: false,
  },
];
