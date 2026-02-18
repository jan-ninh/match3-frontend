// src/features/grid/ui/laser/laserTimings.ts

/**
 * Laser timings (UI bridge).
 *
 * Goal:
 * - SFX should play immediately on confirm (in the same user gesture tick).
 * - Engine dispatch should be delayed to control when the board effect starts.
 *
 * Units: milliseconds.
 */
export const LASER_ENGINE_DELAY_MS = 700;
