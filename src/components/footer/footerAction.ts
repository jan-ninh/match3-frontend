// src/components/footer/footerAction.ts
import type { PowerKey, Powers } from '@/types';

import gridlaserIcon from '@/assets/items/gridlaser.png';
import laserIcon from '@/assets/items/laser.png';
import reshuffleIcon from '@/assets/items/reshuffle.png';
// import button4IconPng from '@/assets/items/footer-button4.png';

type ActionItem = {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  badge?: string;
  count?: number;
};

/**
 * Footer button model.
 *
 * PNG placeholders live in `src/assets/items/*`.
 * Replace those PNG files with your final 256×256 transparent icons (keep filenames for zero code changes).
 */
export const footerActions = (openSettings: () => void, powers: Powers, onUsePower: (key: PowerKey) => void): ActionItem[] => [
  {
    id: 'bomb',
    label: 'Bomb',
    icon: gridlaserIcon,
    count: powers.bomb,
    onClick: () => onUsePower('bomb'),
  },
  {
    id: 'laser',
    label: 'Laser',
    icon: laserIcon,
    count: powers.laser,
    onClick: () => onUsePower('laser'),
  },
  {
    id: 'extraShuffle',
    label: 'Reshuffle',
    icon: reshuffleIcon,
    count: powers.extraShuffle,
    onClick: () => onUsePower('extraShuffle'),
  },

  // Button4 placeholder (function TBD)
  {
    id: 'button4',
    label: 'Button4',
    // icon: button4IconPng,
    onClick: () => undefined,
  },

  {
    id: 'settings-main',
    label: 'Settings',
    icon: '/icons/setting.svg',
    onClick: openSettings,
  },
];
