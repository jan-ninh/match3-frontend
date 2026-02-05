type ActionItem = {
  id: string;
  icon: string;
  badge?: string;
  label: string;
  onClick: () => void;
};

export const footerActions = (openSettings: () => void): ActionItem[] => [
  {
    id: 'power-up',
    label: 'Power Choice',
    icon: '/icons/extraTime.svg',
    badge: '/icons/flash.svg',
    onClick: () => console.log('extraTime Choice clicked'),
  },
  {
    id: 'debug-win',
    label: 'Debug Win',
    icon: '/icons/bomb.svg',
    badge: '/icons/flash.svg',
    onClick: () => console.log('Bomb Choice clicked'),
  },
  {
    id: 'debug-lose',
    label: 'Debug Lose',
    icon: '/icons/rocket.svg',
    badge: '/icons/flash.svg',
    onClick: () => console.log('Power Choice clicked'),
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
