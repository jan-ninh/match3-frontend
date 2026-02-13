// src/features/devtools-host/ui/DevtoolsHost.tsx
import { useCallback, useEffect, useRef, useState } from 'react';

import { cycleTilesetPalette, preloadTiles } from '@/features/grid/ui/tiles';
import { cycleSpecialTilesetPalette, preloadSpecialTiles } from '@/features/grid/ui/tilesSpecial';
import { useOverlays } from '@/features/overlays';
import { completeLevel, resetProgress } from '@/services/progress/progressActions';
import { useAuth } from '@/context/AuthContext';
import { usePowers } from '@/context/PowerContext';

import { useDevHotkeys } from '../lib/useDevHotkeys';
import { useDevPanelsTopSync } from '../lib/useDevPanelsTopSync';
import { useMatch3Engine } from '../lib/useMatch3Engine';

import DevPanels from './DevPanels';
import GameContainer from './GameContainer';

type Props = {
  initialLevelId?: number;
};

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
  const [showLockoutHints, setShowLockoutHints] = useState<boolean>(false);
  const [debugEnabled, setDebugEnabled] = useState<boolean>(false);

  const { openWin, openLose, openPowerChoice } = useOverlays();
  const { user, updatePowers } = useAuth();
  const { powers, setPowers } = usePowers();

  const { isDev, state, inputLocked, canSwapAt, onIntent, onDevResetBoard, onDevNextLevel, onDevPrevLevel, onDevSetLevel, events } = useMatch3Engine({
    initialLevelId,
  });

  const gridRowRef = useRef<HTMLDivElement | null>(null);

  useDevHotkeys({
    enabled: isDev,
    onToggle: () => setDebugEnabled((v) => !v),
  });

  useDevPanelsTopSync({
    enabled: isDev && debugEnabled,
    gridRowRef,
    deps: [state.levelId, state.width, state.height, showLockoutHints],
  });

  // Dev-only: force rerender when changing tiles palette (palette lives in module state)
  const [tilesVersion, setTilesVersion] = useState(0);

  const onDevNextTilesPalette = () => {
    cycleTilesetPalette();
    cycleSpecialTilesetPalette();
    preloadTiles();
    preloadSpecialTiles();
    setTilesVersion((v) => (v + 1) | 0);
  };

  const handledWinLevelRef = useRef<number | null>(null);
  const handledLoseLevelRef = useRef<number | null>(null);

  const beginWinRewardFlow = useCallback(
    (lvl: number) => {
      openPowerChoice({
        title: 'Choose your Power!',
        onChoose: async (powerId) => {
          const add = powerId === 'bomb' ? 2 : 1;

          // 1) Optimistic local powers update (immediate feedback)
          const nextPowers =
            powerId === 'bomb'
              ? { ...powers, bomb: powers.bomb + add }
              : powerId === 'rocket'
                ? { ...powers, rocket: powers.rocket + add }
                : { ...powers, extraTime: powers.extraTime + add };

          setPowers(nextPowers);

          // 2) Persist reward for logged-in users (best-effort)
          if (user?.id) {
            const delta = powerId === 'bomb' ? { bomb: add } : powerId === 'rocket' ? { rocket: add } : { extraTime: add };

            try {
              await updatePowers(delta, 'add');
            } catch {
              // ignore (offline / backend issues)
            }
          }

          // 3) Mark level completed locally (unlocks next level in local map)
          try {
            await completeLevel(lvl);
          } catch {
            // ignore (localStorage)
          }

          // 4) Show Win overlay (PowerChoice overlay auto-closes right after click)
          openWin(lvl);
        },
      });
    },
    [openPowerChoice, powers, setPowers, user?.id, updatePowers, openWin],
  );

  const onDevWin = async () => {
    const lvl = state.levelId;

    // prevent double-trigger if the engine is already in win phase for this lvl
    handledWinLevelRef.current = lvl;

    // IMPORTANT: do NOT openWin directly; go through PowerChoice flow
    beginWinRewardFlow(lvl);
  };

  const onDevLose = async () => {
    const lvl = state.levelId;
    await resetProgress();
    onDevSetLevel(1);
    openLose(lvl);
  };

  const onDevResetProgress = async () => {
    await resetProgress();
  };

  useEffect(() => {
    const lvl = state.levelId;

    if (state.phase === 'win') {
      if (handledWinLevelRef.current === lvl) return;
      handledWinLevelRef.current = lvl;

      beginWinRewardFlow(lvl);
      return;
    }

    if (state.phase === 'lose') {
      if (handledLoseLevelRef.current === lvl) return;
      handledLoseLevelRef.current = lvl;

      void (async () => {
        try {
          await resetProgress();
        } catch {
          // ignore (localStorage)
        }
        openLose(lvl);
      })();

      return;
    }
  }, [state.phase, state.levelId, beginWinRewardFlow, openLose]);

  // defensive: when leaving dev mode, reset the top-offset CSS var
  useEffect(() => {
    if (isDev && debugEnabled) return;
    document.documentElement.style.removeProperty('--dev-panels-top');
  }, [isDev, debugEnabled]);

  return (
    <div className="w-full">
      <DevPanels enabled={isDev && debugEnabled} events={events} onDevWin={onDevWin} onDevLose={onDevLose} onDevResetProgress={onDevResetProgress} />

      <GameContainer
        state={state}
        inputLocked={inputLocked}
        canSwapAt={canSwapAt}
        onIntent={onIntent}
        isDev={isDev}
        debugEnabled={debugEnabled}
        showLockoutHints={showLockoutHints}
        onToggleShowLockoutHints={() => setShowLockoutHints((v) => !v)}
        onDevResetBoard={onDevResetBoard}
        onDevPrevLevel={onDevPrevLevel}
        onDevNextLevel={onDevNextLevel}
        onDevNextTilesPalette={onDevNextTilesPalette}
        gridRowRef={gridRowRef}
        tilesVersion={tilesVersion}
      />
    </div>
  );
}
