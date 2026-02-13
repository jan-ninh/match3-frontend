// src\features\grid\lib\useTilesetSync.ts
import { useEffect } from 'react';
import { preloadTiles, setTilesetLevel } from '@/features/grid/ui/tiles';

/**
 * Syncs tileset to current level and preloads assets.
 */
export function useTilesetSync(levelId: number): void {
  useEffect(() => {
    setTilesetLevel(levelId);
    preloadTiles();
  }, [levelId]);
}
