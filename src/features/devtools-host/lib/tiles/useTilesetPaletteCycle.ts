// src/features/devtools-host/lib/tiles/useTilesetPaletteCycle.ts
import { useCallback, useState } from 'react';

import { cycleTilesetPalette, preloadTiles } from '@/features/grid/ui/tiles';
import { cycleSpecialTilesetPalette, preloadSpecialTiles } from '@/features/grid/ui/tilesSpecial';

export function useTilesetPaletteCycle(): {
  tilesVersion: number;
  onDevNextTilesPalette: () => void;
} {
  // Dev-only: force rerender when changing tiles palette (palette lives in module state).
  const [tilesVersion, setTilesVersion] = useState(0);

  const onDevNextTilesPalette = useCallback(() => {
    cycleTilesetPalette();
    cycleSpecialTilesetPalette();
    preloadTiles();
    preloadSpecialTiles();
    setTilesVersion((v) => (v + 1) | 0);
  }, []);

  return { tilesVersion, onDevNextTilesPalette };
}
