import type { RefObject } from 'react';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { EngineState } from '@/gamelogic';
import type { PossibleMatchSwap } from '@/gamelogic/match';
import { LEVEL07_TUNING } from '@/gamelogic/levels/level-07';
import { useCoreSfxWarmup, useEngineMatchObjectiveSfx } from '@/features/audio';
import { useLaserItemSfx } from '@/features/audio/sfx/useLaserItemSfx';
import { Grid, type InputIntent } from '@/features/grid';
import { useHudInputFromState } from '@/features/devtools-host/lib/useHudInputFromState';
import { setMatchRushPercent } from '@/features/devtools-host/ui/hud/level07/matchRushProgressStore';
import { setMatchRushTimeLeftSec } from '@/features/devtools-host/ui/hud/level07/matchRushTimeStore';
// 🔥 tiles are module-level state -> must force rerender when they change
import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';
import { preloadSpecialTiles, setSpecialTilesetLevel } from '@/features/grid/ui/tilesSpecial';

import type { BombVfxMode } from '@/features/grid/ui/bomb/fx/BombExplosionFxLayer';

import { GameStage } from './GameStage';
import GameplayHud from './GameplayHud';

type Props = {
  state: EngineState;
  inputLocked: boolean;

  canSwapAt: (from: number, to: number) => boolean;
  onIntent: (intent: InputIntent) => void;

  // Runtime / environment
  isDev?: boolean;
  debugEnabled?: boolean;

  // Dev-only visuals
  showLockoutHints?: boolean;
  onToggleShowLockoutHints?: () => void;

  // Dev: match hints (read-only overlay)
  showMatches?: boolean;
  matchSwaps?: readonly PossibleMatchSwap[];

  onToggleShowMatches?: () => void;

  // Dev actions
  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevSetLevel?: (levelId: number) => void;
  onDevNextTilesPalette?: () => void;

  // Level 07: time expiry (UI-driven lose)
  onTimeExpired?: () => void;

  // Ref injection for devtools panel sync
  gridRowRef?: RefObject<HTMLDivElement | null>;

  // Triggers re-render on tiles palette changes
  tilesVersion?: number;
};

const noop = () => undefined;
const noopSetLevel = (_levelId: number) => undefined;

type SeenRing = {
  set: Set<string>;
  order: string[];
};

function markSeen(seen: SeenRing, id: string, max: number): boolean {
  if (seen.set.has(id)) return false;
  seen.set.add(id);
  seen.order.push(id);

  while (seen.order.length > max) {
    const oldest = seen.order.shift();
    if (oldest) seen.set.delete(oldest);
  }

  return true;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

/**
 * Best-effort extraction of match group length from engine events.
 * (This mirrors existing SFX logic in useMatch3Engine.ts.)
 */
function extractMatchLen(ev: unknown): number | null {
  if (!isRecord(ev)) return null;

  const t = ev.type;
  if (typeof t !== 'string') return null;

  // Keep this conservative to avoid false positives.
  if (!/match/i.test(t)) return null;

  const numKeys: readonly string[] = ['len', 'size', 'count', 'matchLen', 'matchSize'] as const;
  for (const k of numKeys) {
    const v = ev[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  }

  const arrKeys: readonly string[] = ['cells', 'indices', 'indexes', 'tiles', 'positions', 'coords', 'points', 'group'] as const;
  for (const k of arrKeys) {
    const v = ev[k];
    if (Array.isArray(v)) return v.length;
  }

  // Some events may carry a single match group under a nested key.
  const g = ev.match;
  if (Array.isArray(g)) return g.length;

  return null;
}

function extractMatchEventId(ev: unknown, matchLen: number, fallbackIndex: number): string | null {
  if (!isRecord(ev)) return null;

  const t = ev.type;
  if (typeof t !== 'string' || t.length === 0) return null;

  const idKeys: readonly string[] = ['id', 'eventId', 'seq', 'token'] as const;
  for (const k of idKeys) {
    const v = ev[k];
    if (typeof v === 'number' && Number.isFinite(v)) return `${t}:${k}:${Math.floor(v)}`;
    if (typeof v === 'string' && v.length > 0) return `${t}:${k}:${v}`;
  }

  const at = ev.atMs ?? ev.nowMs ?? ev.timeMs;
  if (typeof at === 'number' && Number.isFinite(at)) return `${t}:at:${Math.floor(at)}:len:${matchLen}`;

  // Last resort: stable-ish fingerprint (best-effort).
  try {
    const s = JSON.stringify(ev);
    if (typeof s === 'string' && s.length > 0) return `${t}:len:${matchLen}:json:${s.slice(0, 180)}`;
  } catch {
    // ignore
  }

  return `${t}:len:${matchLen}:i:${fallbackIndex}`;
}

function toScaledUnits(baseUnits: number): number {
  const m = LEVEL07_TUNING.globalMultiplier;
  if (typeof m !== 'number' || !Number.isFinite(m)) return baseUnits;
  return baseUnits * m;
}

function unitsForMatchLen(matchLen: number): number {
  const len = clampInt(matchLen, 0, 99);
  if (len < 3) return 0;

  const u = LEVEL07_TUNING.matchUnits;
  const base = len >= 5 ? u.match5 : len === 4 ? u.match4 : u.match3;
  return toScaledUnits(base);
}

function unitsForPowerUsedKey(key: string): number {
  const u = LEVEL07_TUNING.itemUnits;

  // 3x3 item (new UI key 'gridlaser', legacy key 'bomb')
  if (key === 'gridlaser' || key === 'bomb') return toScaledUnits(u.gridlaser3x3);

  // row-laser
  if (key === 'laser') return toScaledUnits(u.laserRow);

  return 0;
}

function getTargetUnits(): number {
  const raw = LEVEL07_TUNING.targetUnits;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(raw));
}

export default function GameContainer({
  state,
  inputLocked,
  canSwapAt,
  onIntent,
  isDev = false,
  debugEnabled = false,
  showLockoutHints = false,
  onToggleShowLockoutHints,
  showMatches = false,
  matchSwaps = [],
  onToggleShowMatches,
  onDevNextTilesPalette,
  onDevResetBoard,
  onDevPrevLevel,
  onDevNextLevel,
  onDevSetLevel,
  onTimeExpired,
  gridRowRef,
}: Props) {
  // Audio warmup + engine-event→SFX mapping
  useCoreSfxWarmup();
  useEngineMatchObjectiveSfx(state);

  // Item SFX (ACK-driven)
  useLaserItemSfx();

  // Bump component render when tileset/palette changes (tiles live outside React state)
  const [, bumpTilesRender] = useReducer((n: number) => (n + 1) % 1_000_000_000, 0);

  // Sync tilesets to current level AND force rerender so sprites switch immediately
  useEffect(() => {
    setTilesetLevel(state.levelId);
    setSpecialTilesetLevel(state.levelId);

    // Preload the currently active sheets (nice-to-have, but helps avoid “late” swap feel)
    preloadTiles();
    preloadSpecialTiles();

    bumpTilesRender();
  }, [state.levelId]);

  const handleDevNextTilesPalette = useCallback(() => {
    onDevNextTilesPalette?.();

    // palette change also updates module globals -> force rerender now
    preloadTiles();
    preloadSpecialTiles();
    bumpTilesRender();
  }, [onDevNextTilesPalette]);

  // ─────────────────────────────────────────────────────────────
  // Level 07: UI-only Match Rush progress (display only)
  // ─────────────────────────────────────────────────────────────

  const matchRushRef = useRef<{
    units: number;
    seenMatch: SeenRing;
    seenFallback: SeenRing;
    seenPower: SeenRing;
  }>({
    units: 0,
    seenMatch: { set: new Set<string>(), order: [] },
    seenFallback: { set: new Set<string>(), order: [] },
    seenPower: { set: new Set<string>(), order: [] },
  });

  // Reset progress whenever we leave/enter the level.
  useEffect(() => {
    matchRushRef.current.units = 0;
    matchRushRef.current.seenMatch = { set: new Set<string>(), order: [] };
    matchRushRef.current.seenFallback = { set: new Set<string>(), order: [] };
    matchRushRef.current.seenPower = { set: new Set<string>(), order: [] };

    // Only Level 07 shows the bar, but we reset to 0 globally so stale UI never leaks.
    setMatchRushPercent(0);
  }, [state.levelId]);

  // Increment progress whenever new match/item events appear.
  useEffect(() => {
    if (state.levelId !== 7) return;

    const target = getTargetUnits();

    const seenMatch = matchRushRef.current.seenMatch;
    const seenFallback = matchRushRef.current.seenFallback;
    const seenPower = matchRushRef.current.seenPower;

    let addUnits = 0;
    let sawGroupMatch = false;

    for (let i = 0; i < state.events.length; i += 1) {
      const ev = state.events[i];

      // 1) Match group events (preferred: supports match3/4/5 weights)
      const len = extractMatchLen(ev);
      if (len != null && len >= 3) {
        sawGroupMatch = true;

        const id = extractMatchEventId(ev, len, i);
        if (!id) continue;
        if (!markSeen(seenMatch, id, 1024)) continue;

        addUnits += unitsForMatchLen(len);
        continue;
      }

      // 2) Item usage (gridlaser / row-laser)
      if (ev && typeof ev === 'object') {
        const rec = ev as Record<string, unknown>;
        if (rec.type === 'powerUsed') {
          const key = rec.key;
          const requestId = rec.requestId;

          if (typeof key !== 'string') continue;
          if (typeof requestId !== 'number' || !Number.isFinite(requestId)) continue;

          const id = `${key}:${Math.floor(requestId)}`;
          if (!markSeen(seenPower, id, 512)) continue;

          addUnits += unitsForPowerUsedKey(key);
        }
      }
    }

    // 3) Fallback: if we didn't see any match-group events, use matchesFound.groups as match3.
    // This keeps the bar moving even if detailed match events aren't emitted.
    if (!sawGroupMatch) {
      for (let i = 0; i < state.events.length; i += 1) {
        const ev = state.events[i];
        if (!ev || typeof ev !== 'object') continue;

        const rec = ev as Record<string, unknown>;
        if (rec.type !== 'matchesFound') continue;

        const clears = rec.clears;
        const groups = rec.groups;

        if (typeof groups !== 'number' || !Number.isFinite(groups)) continue;

        // Dedupe: stable per-turn, per-index fingerprint.
        const id = `t:${state.turnIndex | 0}:i:${i}:c:${typeof clears === 'number' ? Math.floor(clears) : -1}:g:${Math.floor(groups)}`;
        if (!markSeen(seenFallback, id, 512)) continue;

        const g = Math.max(0, Math.floor(groups));
        if (g <= 0) continue;

        addUnits += toScaledUnits(LEVEL07_TUNING.matchUnits.match3) * g;
      }
    }

    if (addUnits <= 0) return;

    const nextUnits = clamp(matchRushRef.current.units + addUnits, 0, target);
    if (Object.is(nextUnits, matchRushRef.current.units)) return;

    matchRushRef.current.units = nextUnits;

    const nextPercent = clamp((nextUnits / target) * 100, 0, 100);
    setMatchRushPercent(nextPercent);
  }, [state.levelId, state.turnIndex, state.events]);

  // ─────────────────────────────────────────────────────────────
  // Level 07: UI-only countdown (display + lose trigger)
  // ─────────────────────────────────────────────────────────────

  const timeRef = useRef<{ startedAtMs: number; lastShownSec: number; didExpire: boolean }>({
    startedAtMs: 0,
    lastShownSec: -1,
    didExpire: false,
  });

  // Reset timer whenever level changes.
  useEffect(() => {
    timeRef.current.startedAtMs = performance.now();
    timeRef.current.lastShownSec = -1;
    timeRef.current.didExpire = false;

    if (state.levelId === 7) {
      const limit = clampInt(LEVEL07_TUNING.timeLimitSec, 1, 60 * 60);
      setMatchRushTimeLeftSec(limit);
      timeRef.current.lastShownSec = limit;
      return;
    }

    // For other levels: keep at 0 so the widget never shows stale state.
    setMatchRushTimeLeftSec(0);
  }, [state.levelId]);

  // Run countdown even when player doesn't act.
  useEffect(() => {
    if (state.levelId !== 7) return;

    // Stop ticking once the run is already resolved.
    if (state.phase === 'win' || state.phase === 'lose') return;

    const limit = clampInt(LEVEL07_TUNING.timeLimitSec, 1, 60 * 60);

    const tick = () => {
      const elapsedMs = Math.max(0, performance.now() - timeRef.current.startedAtMs);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const left = Math.max(0, limit - elapsedSec);

      if (left !== timeRef.current.lastShownSec) {
        timeRef.current.lastShownSec = left;
        setMatchRushTimeLeftSec(left);
      }

      if (left <= 0 && !timeRef.current.didExpire) {
        timeRef.current.didExpire = true;
        onTimeExpired?.();
      }
    };

    tick();

    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [onTimeExpired, state.levelId, state.phase]);

  // Derive HUD input from engine state
  const hudInput = useHudInputFromState(state);

  const gridElement = (
    <Grid
      state={state}
      inputLocked={inputLocked}
      canSwapAt={canSwapAt}
      onIntent={onIntent}
      debugEnabled={debugEnabled}
      showMatches={showMatches}
      matchSwaps={matchSwaps}
      onToggleShowMatches={onToggleShowMatches ?? noop}
      swapMs={state.swapMs}
      bombVfxMode={'legacyShock' satisfies BombVfxMode}
      showLockoutHints={showLockoutHints}
      showDebugLabels={debugEnabled}
      onToggleShowLockoutHints={onToggleShowLockoutHints ?? noop}
      onDevPrevLevel={onDevPrevLevel ?? noop}
      onDevNextLevel={onDevNextLevel ?? noop}
      onDevSetLevel={onDevSetLevel ?? noopSetLevel}
      onDevResetBoard={onDevResetBoard ?? noop}
      onDevNextTilesPalette={handleDevNextTilesPalette}
    />
  );

  const hudElement = <GameplayHud {...hudInput} />;

  return <GameStage gridRowRef={gridRowRef} grid={gridElement} hud={hudElement} />;

  // Keep isDev in scope for potential future use (prevents unused-var warning)
  void isDev;
}
