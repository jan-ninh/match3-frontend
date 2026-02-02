import { footerActions } from './footerAction';

type Props = {
  openSettings: () => void;
  openPowerChoice: (args: { title: string }) => void;
  openWin: (level: number) => void;
  openLose: (level: number) => void;
};

export default function GameFooter({ openSettings, openPowerChoice, openWin, openLose }: Props) {
  const actions = footerActions(openSettings, openPowerChoice, openWin, openLose);

  return (
    <div className="flex flex-wrap justify-center gap-4 p-4 rounded-xl">
      {actions.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          aria-label={item.label}
          className="relative w-24 h-16 flex items-center justify-center border border-white/20 hover:scale-105 transition focus:outline-none focus:ring"
          type="button"
        >
          <img src={item.icon} alt={item.label} className="w-8 h-8" />
          {item.badge && (
            <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20">
              <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}