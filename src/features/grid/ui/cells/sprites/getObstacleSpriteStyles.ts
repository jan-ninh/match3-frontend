import type { CSSProperties } from 'react';

import { getSpecialTileSprite, specialSpike, specialTile_04 } from '../../tiles-special';
import { spriteToBgStyle } from './spriteToBgStyle';

export type ObstacleSpriteStyles = {
  blockedPlain?: CSSProperties;
  spike?: CSSProperties;
  leakOpen?: CSSProperties;
  leakSealed?: CSSProperties;
  contamination?: CSSProperties;
  sealKit?: CSSProperties;
};

export function getObstacleSpriteStyles(): ObstacleSpriteStyles {
  return {
    blockedPlain: spriteToBgStyle(getSpecialTileSprite(specialTile_04)),
    spike: spriteToBgStyle(getSpecialTileSprite(specialSpike)),
    leakOpen: spriteToBgStyle(getSpecialTileSprite('leakOpen')),
    leakSealed: spriteToBgStyle(getSpecialTileSprite('leakSealed')),
    contamination: spriteToBgStyle(getSpecialTileSprite('contamination')),
    sealKit: spriteToBgStyle(getSpecialTileSprite('sealKit')),
  };
}
