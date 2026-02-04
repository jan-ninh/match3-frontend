// src/ui/Tile.tsx
import { tileSrc, type TileKind } from './tiles';

export function Tile({ kind, size = 48 }: { kind: TileKind; size?: number }) {
  return <img src={tileSrc[kind]} width={size} height={size} alt={`${kind} tile`} draggable={false} style={{ display: 'block' }} />;
}
