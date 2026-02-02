import { Link } from 'react-router';
import { useOverlays } from '@/features/overlays';

type NavItem = {
  label: string;
  icon: string;
  to?: string;
  onClick?: () => void;
};

export default function Navbar() {
  const { openLogin, openSettings } = useOverlays();

  const navItems: NavItem[] = [
    { label: 'Home', icon: '/icons/home.svg', to: '/game-map' },
    { label: 'Login', icon: '/icons/login.svg', onClick: openLogin },
    { label: 'Leaderboard', icon: '/icons/cup.svg', to: '/game-map/leaderboard' },
    { label: 'Profile', icon: '/icons/user.svg', to: '/game-map/profile' },
    { label: 'Settings', icon: '/icons/setting.svg', onClick: openSettings }
  ];

  return (
    <nav className="flex justify-between p-6 items-center">
      <h1 className="text-xl font-bold">Match-3</h1>

      <ul className="flex gap-6 items-center">
        {navItems.map(({ label, icon, to, onClick }) => (
          <li key={label}>
            <Link
              to={to || '#'}
              onClick={(e) => {
                if (!onClick) return;
                if (!to) e.preventDefault();
                onClick();
              }}
              className="flex flex-col items-center p-1 hover:bg-white/10 transition-colors rounded"
              aria-label={label}
              title={label}
            >
              <img src={icon} alt={label} className="w-8 h-8" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}