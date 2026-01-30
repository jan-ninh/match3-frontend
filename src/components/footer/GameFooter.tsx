import React from 'react';
import { footerActions } from './footerAction';

interface GameFooterProps {
  openSettings: () => void;
  openPowerChoice: (args: { title: string }) => void;
  openWin: (level: number) => void;
  openLose: (level: number) => void;
}

const GameFooter: React.FC<GameFooterProps> = ({ openSettings, openPowerChoice, openWin, openLose }) => {
  const actions = footerActions(openSettings, openPowerChoice, openWin, openLose);

  return (
    <div className="flex flex-wrap justify-center gap-4 p-4 rounded-xl">
      {actions.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          aria-label={item.label} // accessibility
          className="relative w-23 h-16 flex items-center justify-center border hover:scale-105 transition focus:outline-none focus:ring"
          type="button"
        >
          {/* main icon */}
          <img src={item.icon} alt={item.label} className="w-8 h-8" />

          {/* optional badge */}
          {item.badge && (
            <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border">
              <img src={item.badge} alt="" className="w-3 h-3" aria-hidden="true" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default GameFooter;
