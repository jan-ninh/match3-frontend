type ActionItem = {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  badge?: string;
  count?: number;
};

import type { PowerKey, Powers } from '@/types';

export const footerActions = (openSettings: () => void, powers: Powers, onUsePower: (key: PowerKey) => void): ActionItem[] => [
  {
    id: 'bomb',
    label: 'Bomb',
    icon: '/icons/bomb.svg',
    count: powers.bomb,
    onClick: () => onUsePower('bomb'),
  },
  {
    id: 'rocket',
    label: 'Rocket',
    icon: '/icons/rocket.svg',
    count: powers.rocket,
    onClick: () => onUsePower('rocket'),
  },
  {
    id: 'extraShuffle',
    label: 'Extra Time',
    icon: '/icons/extraShuffle.svg',
    count: powers.extraShuffle,
    onClick: () => onUsePower('extraShuffle'),
  },
  {
    id: 'tip',
    label: 'Tip',
    icon: '/icons/key.svg',
    onClick: () => console.log('Tip clicked'),
  },
  {
    id: 'settings-main',
    label: 'Settings',
    icon: '/icons/setting.svg',
    onClick: openSettings,
  },
];
