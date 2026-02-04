// src/ui/tiles.ts
import blue from '@/assets/tiles/blue.svg';
import red from '@/assets/tiles/red.svg';
// ...

export const tileSrc = {
  blue,
  red,
  // ...
} as const;

export type TileKind = keyof typeof tileSrc;
