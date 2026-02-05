import { Link } from 'react-router';
import { useOverlays } from '@/features/overlays';

type NavLinkItem = {
  kind: 'link';
  label: string;
  icon: string;
  to: string;
};

type NavActionItem = {
  kind: 'action';
  label: string;
  icon: string;
  onClick: () => void;
};

type NavItem = NavLinkItem | NavActionItem;

export default function Navbar() {
  const { openLogin, openSettings } = useOverlays();

  const navItems: NavItem[] = [
    { kind: 'link', label: 'Home', icon: '/icons/home.svg', to: '/game-map' },
    { kind: 'action', label: 'Login', icon: '/icons/login.svg', onClick: openLogin },
    { kind: 'link', label: 'logout', icon: '/icons/logout.svg', to: '/game-map' },
    { kind: 'link', label: 'Leaderboard', icon: '/icons/cup.svg', to: '/game-map/leaderboard' },
    { kind: 'link', label: 'Home', icon: '/icons/heart.svg', to: '/game-map' },
    { kind: 'link', label: 'Profile', icon: '/icons/user.svg', to: '/game-map/profile' },
    { kind: 'action', label: 'Settings', icon: '/icons/setting.svg', onClick: openSettings },
  ];

  return (
    <nav className="flex justify-between p-6 items-center">
      <h1 className="text-xl font-bold">Match-3</h1>

      <ul className="flex gap-6 items-center">
        {navItems.map((item) => (
          <li key={item.label}>
            {item.kind === 'link' ? (
              <Link
                to={item.to}
                className="flex flex-col items-center p-1 hover:bg-white/10 transition-colors rounded"
                aria-label={item.label}
                title={item.label}
              >
                <img src={item.icon} alt={item.label} className="w-8 h-8" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center p-1 hover:bg-white/10 transition-colors rounded"
                aria-label={item.label}
                title={item.label}
              >
                <img src={item.icon} alt={item.label} className="w-8 h-8" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
