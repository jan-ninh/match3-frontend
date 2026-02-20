// src/features/devtools-host/ui/GameContainer.tsx
import type { RefObject } from 'react';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { EngineState } from '@/gamelogic';
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

  // Dev actions
  onDevResetBoard?: () => void;
  onDevPrevLevel?: () => void;
  onDevNextLevel?: () => void;
  onDevNextTilesPalette?: () => void;

  // Level 07: time expiry (UI-driven lose)
  onTimeExpired?: () => void;

  // Ref injection for devtools panel sync
  gridRowRef?: RefObject<HTMLDivElement | null>;

  // Triggers re-render on tiles palette changes
  tilesVersion?: number;
};

const noop = () => undefined;

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

// UI-only tuning: how many cleared tiles (from matchesFound.clears) correspond to 100%.
const MATCH_RUSH_TARGET_CLEARS_FOR_FULL = 500;
const MATCH_RUSH_TIME_LIMIT_SEC = 120;

export default function GameContainer({
  state,
  inputLocked,
  canSwapAt,
  onIntent,
  isDev = false,
  debugEnabled = false,
  showLockoutHints = false,
  onToggleShowLockoutHints,
  onDevNextTilesPalette,
  onDevResetBoard,
  onDevPrevLevel,
  onDevNextLevel,
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

  const matchRushRef = useRef<{ percent: number; seen: SeenRing }>({
    percent: 0,
    seen: { set: new Set<string>(), order: [] },
  });

  // Reset progress whenever we leave/enter the level.
  useEffect(() => {
    matchRushRef.current.percent = 0;
    matchRushRef.current.seen = { set: new Set<string>(), order: [] };

    // Only Level 07 shows the bar, but we reset to 0 globally so stale UI never leaks.
    setMatchRushPercent(0);
  }, [state.levelId]);

  // Increment progress whenever new match events appear.
  useEffect(() => {
    if (state.levelId !== 7) return;

    const seen = matchRushRef.current.seen;

    let addPercent = 0;

    for (let i = 0; i < state.events.length; i += 1) {
      const ev = state.events[i];
      if (ev.type !== 'matchesFound') continue;

      const clears = Math.max(0, (ev.clears ?? 0) | 0);
      const groups = Math.max(0, (ev.groups ?? 0) | 0);

      // Dedupe: stable per-turn, per-index fingerprint.
      const id = `t:${state.turnIndex | 0}:i:${i}:c:${clears}:g:${groups}`;
      if (!markSeen(seen, id, 512)) continue;

      if (clears <= 0) continue;

      addPercent += (clears / MATCH_RUSH_TARGET_CLEARS_FOR_FULL) * 100;
    }

    if (addPercent <= 0) return;

    const next = clamp(matchRushRef.current.percent + addPercent, 0, 100);
    if (Object.is(next, matchRushRef.current.percent)) return;

    matchRushRef.current.percent = next;
    setMatchRushPercent(next);
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
      setMatchRushTimeLeftSec(MATCH_RUSH_TIME_LIMIT_SEC);
      timeRef.current.lastShownSec = MATCH_RUSH_TIME_LIMIT_SEC;
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

    const tick = () => {
      const elapsedMs = Math.max(0, performance.now() - timeRef.current.startedAtMs);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const left = Math.max(0, MATCH_RUSH_TIME_LIMIT_SEC - elapsedSec);

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
      swapMs={state.swapMs}
      bombVfxMode={'legacyShock' satisfies BombVfxMode}
      showLockoutHints={showLockoutHints}
      showDebugLabels={debugEnabled}
      onToggleShowLockoutHints={onToggleShowLockoutHints ?? noop}
      onDevPrevLevel={onDevPrevLevel ?? noop}
      onDevNextLevel={onDevNextLevel ?? noop}
      onDevResetBoard={onDevResetBoard ?? noop}
      onDevNextTilesPalette={handleDevNextTilesPalette}
    />
  );

  const hudElement = <GameplayHud {...hudInput} />;

  return <GameStage gridRowRef={gridRowRef} grid={gridElement} hud={hudElement} />;

  // Keep isDev in scope for potential future use (prevents unused-var warning)
  void isDev;
}
