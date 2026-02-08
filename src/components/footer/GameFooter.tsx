import { footerActions } from './footerAction';
import { usePowers } from '@/context/PowerContext';
import { useAuth } from '@/context/AuthContext';
import type { PowerKey, Powers } from '@/types';

type Props = {
  openSettings: () => void;
};

export default function GameFooter({ openSettings }: Props) {
  const { powers } = usePowers();
  const { setPowers } = usePowers();
  const { user, updatePowers } = useAuth();

  const onUsePower = async (key: PowerKey) => {
    const current = powers[key] ?? 0;
    if (current <= 0) return;

    const next: Powers = { ...powers, [key]: current - 1 };
    setPowers(next);

    if (!user) return;

    try {
      await updatePowers({ [key]: next[key] }, 'set');
    } catch {
      // rollback if backend failed
      setPowers(powers);
    }
  };

  const actions = footerActions(openSettings, powers, onUsePower);

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
          {typeof item.count === 'number' && (
            <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20 text-xs text-white">
              {item.count}
            </span>
          )}
          {!item.count && item.badge && (
            <span className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-600 rounded-full border border-white/20">
              <img src={item.badge} alt={item.label} className="w-3 h-3" aria-hidden="true" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
