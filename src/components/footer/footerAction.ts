// src/components/footer/footerAction.ts
import type { PowerKey, Powers } from '@/types';
import gridlaserIcon from '@/assets/items/gridlaser.png';
import laserIcon from '@/assets/items/laser.png';
import reshuffleIcon from '@/assets/items/reshuffle.png';
import noaccessIcon from '@/assets/items/noaccess.png';

type ActionItem = {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  badge?: string;
  count?: number;
};

/**
 * FOOTER BUTTON
 */
export const footerActions = (_openSettings: () => void, powers: Powers, onUsePower: (key: PowerKey) => void): ActionItem[] => [
  {
    // Button1
    id: 'bomb',
    label: 'Bomb',
    icon: gridlaserIcon,
    count: powers.bomb,
    onClick: () => onUsePower('bomb'),
  },

  {
    // Button2
    id: 'laser',
    label: 'Laser',
    icon: laserIcon,
    count: powers.laser,
    onClick: () => onUsePower('laser'),
  },

  {
    // Button3
    id: 'extraShuffle',
    label: 'Reshuffle',
    icon: reshuffleIcon,
    count: powers.extraShuffle,
    onClick: () => onUsePower('extraShuffle'),
  },

  {
    // Button4
    id: 'button4',
    label: 'Button4',
    icon: noaccessIcon,
    onClick: () => undefined,
  },
];
