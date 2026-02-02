type ActionItem = {
  id: string;
  icon: string; // path to icon in public folder
  badge?: string; // path to small badge icon
  label: string; // for accessibility (ARIA)
  onClick: () => void;
  color?: string; // optional color for customization
};
export const footerActions = (
  openSettings: () => void,
  openPowerChoice: (args: { title: string }) => void,
  openWin: (level: number) => void,
  openLose: (level: number) => void,
): ActionItem[] => [
  {
    id: 'power-up',
    label: 'Power Choice',
    icon: '/icons/add-time.svg',
    badge: '/icons/flash.svg',
    onClick: () => openPowerChoice({ title: 'Choose your Power!' }),
  },
  {
    id: 'debug-win',
    label: 'Debug Win',
    icon: '/icons/bomb.svg',
    badge: '/icons/flash.svg',
    onClick: () => openWin(1),
  },
  {
    id: 'debug-lose',
    label: 'Debug Lose',
    icon: '/icons/rocket.svg',
    badge: '/icons/flash.svg',
    onClick: () => openLose(1),
  },
  {
    id: 'tipp',
    label: 'Tip',
    icon: '/icons/key.svg',
    onClick: () => console.log('Refresh clicked'),
  },
  {
    id: 'settings-main',
    label: 'Settings',
    icon: '/icons/setting.svg',
    onClick: openSettings,
  },
];
