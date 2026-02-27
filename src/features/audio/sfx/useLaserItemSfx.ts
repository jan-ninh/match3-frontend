// src/features/audio/sfx/useLaserItemSfx.ts
import { useEffect } from 'react';

import { POWER_ARM_EVENT, POWER_CONSUME_EVENT } from '@/context/powerEvents';

import { playSfx, playSfxUrl, preloadSfx, preloadSfxUrl } from './sfxPlayer';

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

type ArmLike = Readonly<{
  key: string;
  armed: boolean;
}>;

function isArmLike(v: unknown): v is ArmLike {
  if (!isRecord(v)) return false;
  if (typeof v.key !== 'string') return false;
  if (typeof v.armed !== 'boolean') return false;
  return true;
}

type ConsumeLike = Readonly<{
  key: string;
  amount: number;
  requestId?: number;
}>;

function isConsumeLike(v: unknown): v is ConsumeLike {
  if (!isRecord(v)) return false;
  if (typeof v.key !== 'string') return false;
  if (typeof v.amount !== 'number' || !Number.isFinite(v.amount)) return false;

  const rid = v.requestId;
  if (rid !== undefined && (typeof rid !== 'number' || !Number.isFinite(rid))) return false;

  return true;
}

function withBase(path: string): string {
  // Vite guarantees BASE_URL to end with '/' (e.g. '/', '/myapp/').
  const base = import.meta.env.BASE_URL ?? '/';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}

const LASER_ROW_LAYER_URL = withBase('audio/sfx/items/laser/laser_02.wav');

function isLaserPowerKey(k: unknown): k is 'laser' | 'laserRow' | 'laserRowClear' {
  return k === 'laser' || k === 'laserRow' || k === 'laserRowClear';
}

/**
 * Laser (Row-Clear) SFX:
 * - Warm up on ARM (so first shot has low latency).
 * - Play only on ACK (POWER_CONSUME_EVENT) so the sound matches the actual effect.
 *
 * This mirrors the bomb pattern (ACK-driven playback).
 */
export function useLaserItemSfx(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onArm = (e: Event) => {
      const ce = e as CustomEvent<unknown>;
      const d = ce.detail;
      if (!isArmLike(d)) return;
      if (!isLaserPowerKey(d.key)) return;
      if (!d.armed) return;

      void preloadSfx('laserRow');
      void preloadSfxUrl(LASER_ROW_LAYER_URL);
    };

    const onConsume = (e: Event) => {
      const ce = e as CustomEvent<unknown>;
      const d = ce.detail;
      if (!isConsumeLike(d)) return;
      if (!isLaserPowerKey(d.key)) return;

      const amt = d.amount | 0;
      if (amt <= 0) return;

      playSfx('laserRow', { volume: 1 });
      playSfxUrl(LASER_ROW_LAYER_URL, { volume: 1 }, 'laserRow');
    };

    window.addEventListener(POWER_ARM_EVENT, onArm as EventListener);
    window.addEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);

    return () => {
      window.removeEventListener(POWER_ARM_EVENT, onArm as EventListener);
      window.removeEventListener(POWER_CONSUME_EVENT, onConsume as EventListener);
    };
  }, []);
}
