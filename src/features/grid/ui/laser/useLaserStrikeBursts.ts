import { useEffect, useRef, useState } from 'react';
import type { LaserStrikeBurst } from './fx/LaserRowStrikeFxLayer';
import { LASER_STRIKE_PULSE_SEQUENCE, type LaserStrikePulseSpec } from './laserTimings';

export type UseLaserStrikeBurstsOpts = Readonly<{
  defaultStartDelayMs: number;
  defaultLifeMs: number;
}>;

export type PushLaserStrike = {
  (row: number): void;
  (row: number, startDelayMs: number, lifeMs?: number): void; // legacy: single pulse
  (row: number, pulses: readonly LaserStrikePulseSpec[]): void; // default start delay
  (row: number, startDelayMs: number, pulses: readonly LaserStrikePulseSpec[]): void;
};

export type UseLaserStrikeBurstsResult = Readonly<{
  laserStrikes: readonly LaserStrikeBurst[];
  pushLaserStrike: PushLaserStrike;
}>;

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const x = n | 0;
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

type ResolvedPulse = Readonly<{
  gapAfterMs: number;
  lifeMs: number;

  peakOpacity: number;

  bandScaleYFrom: number;
  bandScaleYPeak: number;
  bandScaleYEnd: number;

  coreHeightPct: number;
  corePeakOpacity: number;

  coreScaleYFrom: number;
  coreScaleYPeak: number;
  coreScaleYEnd: number;

  noiseOpacity: number;

  scanEnabled: boolean;
  scanDurationMs: number;
  scanWidthPct: number;
}>;

function resolvePulse(spec: LaserStrikePulseSpec, defaultLifeMs: number): ResolvedPulse {
  const gapAfterMs = clampInt(spec.gapAfterMs ?? 0, 0, 60_000);

  const lifeMs = clampInt(spec.lifeMs ?? defaultLifeMs, 0, 60_000);

  const peakOpacity = clampNum(spec.peakOpacity ?? 1, 0, 1);

  const bandScaleYFrom = clampNum(spec.bandScaleYFrom ?? 0.88, 0.2, 2.5);
  const bandScaleYPeak = clampNum(spec.bandScaleYPeak ?? 1.06, 0.2, 2.5);
  const bandScaleYEnd = clampNum(spec.bandScaleYEnd ?? 1, 0.2, 2.5);

  const coreHeightPct = clampNum(spec.coreHeightPct ?? 22, 4, 96);
  const corePeakOpacity = clampNum(spec.corePeakOpacity ?? 1, 0, 1);

  const coreScaleYFrom = clampNum(spec.coreScaleYFrom ?? 0.6, 0.2, 3.5);
  const coreScaleYPeak = clampNum(spec.coreScaleYPeak ?? 1.05, 0.2, 3.5);
  const coreScaleYEnd = clampNum(spec.coreScaleYEnd ?? 0.9, 0.2, 3.5);

  const noiseOpacity = clampNum(spec.noiseOpacity ?? 0.65, 0, 1);

  const scanEnabled = typeof spec.scanEnabled === 'boolean' ? spec.scanEnabled : true;
  const scanDurationMs = clampInt(spec.scanDurationMs ?? 240, 0, 60_000);
  const scanWidthPct = clampNum(spec.scanWidthPct ?? 26, 4, 80);

  return {
    gapAfterMs,
    lifeMs,
    peakOpacity,
    bandScaleYFrom,
    bandScaleYPeak,
    bandScaleYEnd,
    coreHeightPct,
    corePeakOpacity,
    coreScaleYFrom,
    coreScaleYPeak,
    coreScaleYEnd,
    noiseOpacity,
    scanEnabled,
    scanDurationMs,
    scanWidthPct,
  };
}

// Laser strike FX (UI-only): play a short blue beam on the chosen row.
// Triggered when the user confirms a target cell while laser is armed.
export function useLaserStrikeBursts({ defaultStartDelayMs, defaultLifeMs }: UseLaserStrikeBurstsOpts): UseLaserStrikeBurstsResult {
  const [laserStrikes, setLaserStrikes] = useState<readonly LaserStrikeBurst[]>([]);
  const laserStrikeSeqRef = useRef(0);
  const laserStrikeTimersRef = useRef<Map<string, number[]>>(new Map());

  const addTimer = (id: string, t: number) => {
    const arr = laserStrikeTimersRef.current.get(id);
    if (arr) arr.push(t);
    else laserStrikeTimersRef.current.set(id, [t]);
  };

  const scheduleSinglePulse = (row: number, pulse: ResolvedPulse, startDelayMs: number) => {
    if (typeof window === 'undefined') return;

    const id = `laserStrike-${Date.now()}-${(laserStrikeSeqRef.current += 1)}`;

    // (A) FX start — optionally delayed
    const tStart = window.setTimeout(() => {
      const burst: LaserStrikeBurst = {
        id,
        row,
        lifeMs: pulse.lifeMs,
        peakOpacity: pulse.peakOpacity,
        bandScaleYFrom: pulse.bandScaleYFrom,
        bandScaleYPeak: pulse.bandScaleYPeak,
        bandScaleYEnd: pulse.bandScaleYEnd,
        coreHeightPct: pulse.coreHeightPct,
        corePeakOpacity: pulse.corePeakOpacity,
        coreScaleYFrom: pulse.coreScaleYFrom,
        coreScaleYPeak: pulse.coreScaleYPeak,
        coreScaleYEnd: pulse.coreScaleYEnd,
        noiseOpacity: pulse.noiseOpacity,
        scanEnabled: pulse.scanEnabled,
        scanDurationMs: pulse.scanDurationMs,
        scanWidthPct: pulse.scanWidthPct,
      };

      setLaserStrikes((prev) => [...prev, burst]);

      // (C) FX end — lifetime counted AFTER it becomes visible
      const tEnd = window.setTimeout(() => {
        setLaserStrikes((prev) => prev.filter((b) => b.id !== id));
        laserStrikeTimersRef.current.delete(id);
      }, pulse.lifeMs);

      addTimer(id, tEnd);
    }, startDelayMs);

    addTimer(id, tStart);
  };

  const scheduleSequence = (row: number, startDelayMs: number, specs: readonly LaserStrikePulseSpec[]) => {
    const pulses = specs.length > 0 ? specs : LASER_STRIKE_PULSE_SEQUENCE;
    let t = clampInt(startDelayMs, 0, 60_000);

    for (const spec of pulses) {
      const p = resolvePulse(spec, defaultLifeMs);
      scheduleSinglePulse(row, p, t);
      t += p.lifeMs + p.gapAfterMs;
    }
  };

  const pushLaserStrike: PushLaserStrike = (row: number, a?: number | readonly LaserStrikePulseSpec[], b?: number | readonly LaserStrikePulseSpec[]) => {
    if (typeof window === 'undefined') return;

    // Default: multi-pulse pattern from laserTimings.
    if (typeof a === 'undefined') {
      scheduleSequence(row, defaultStartDelayMs, LASER_STRIKE_PULSE_SEQUENCE);
      return;
    }

    // a is number => (startDelay, life?) legacy OR (startDelay, pulses) new
    if (typeof a === 'number') {
      if (Array.isArray(b)) {
        scheduleSequence(row, a, b);
        return;
      }

      const lifeMs = typeof b === 'number' ? b : defaultLifeMs;
      scheduleSequence(row, a, [{ lifeMs }]);
      return;
    }

    // a is pulses array => default start delay
    if (Array.isArray(a)) {
      scheduleSequence(row, defaultStartDelayMs, a);
      return;
    }

    // Should be unreachable.
    scheduleSequence(row, defaultStartDelayMs, LASER_STRIKE_PULSE_SEQUENCE);
  };

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;
      for (const arr of laserStrikeTimersRef.current.values()) {
        for (const t of arr) window.clearTimeout(t);
      }
      laserStrikeTimersRef.current.clear();
    };
  }, []);

  return { laserStrikes, pushLaserStrike };
}
