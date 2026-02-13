// src/features/devtools-host/lib/useTilesetSync.ts
import { useLayoutEffect, useReducer } from 'react';

import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';
import { preloadSpecialTiles, setSpecialTilesetLevel } from '@/features/grid/ui/tiles-special';

/**
 * Syncs tilesets to current level and preloads assets.
 *
 * Premium: avoids 1-frame "old tiles" flash by
 * - syncing module-level tileset selection in useLayoutEffect (before paint)
 * - forcing an immediate rerender (tiles live outside React state)
 */
export function useTilesetSync(levelId: number): void {
  const [, bump] = useReducer((n: number) => (n + 1) | 0, 0);

  useLayoutEffect(() => {
    setTilesetLevel(levelId);
    setSpecialTilesetLevel(levelId);

    preloadTiles();
    preloadSpecialTiles();

    // module-state changed -> force React to re-read sprites now (before paint)
    bump();
  }, [levelId]);
}
