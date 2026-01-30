import React from 'react';

// Define type for footer buttons
type ActionItem = {
  id: string;
  icon: string; // path to icon in public folder
  badge?: string; // path to small badge icon
  label: string; // for accessibility (ARIA)
  onClick: () => void;
  color?: string; // optional color for customization
};

interface GameFooterProps {
  openSettings: () => void;
  openPowerChoice: (args: { title: string }) => void;
  openWin: (level: number) => void;
  openLose: (level: number) => void;
}

const GameFooter: React.FC<GameFooterProps> = ({ openSettings, openPowerChoice, openWin, openLose }) => {
  // Define all footer buttons
  const actions: ActionItem[] = [
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
      badge: '/icons/flash.svg', // optional small badge
      onClick: () => openLose(1),
    },
    {
      id: 'tipp',
      label: 'tipp',
      icon: '/icons/key.svg',
      onClick: () => console.log('Refresh clicked'),
    },
    {
      id: 'settings-main',
      label: 'Settings',
      icon: '/icons/setting.svg', // read from public folder
      onClick: openSettings,
    },
  ];

  return (
    <div className="flex gap-4 flex-wrap items-center justify-center p-4 rounded-xl">
      {actions.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          title={item.label}
          // Circular button style
          className="relative group flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full hover:bg-gray-200 hover:scale-105 transition-all duration-200 border-2 border-gray-400 active:scale-95"
        >
          {/* Main icon */}
          <img src={item.icon} alt={item.label} className="w-8 h-8 text-gray-700 group-hover:text-black" />

          {/* Small badge icon, if exists */}
          {item.badge && (
            <span className="absolute bottom-0 right-0 translate-x-1 translate-y-1 flex items-center justify-center w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-300 shadow-sm">
              <img src={item.badge} alt="badge" className="w-3 h-3" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default GameFooter;
