import { Link, useNavigate } from 'react-router';
import { useOverlays } from '@/features/overlays';
import { useAuth } from '@/context/AuthContext';
import SpriteIcon from '@/components/SpriteIcon'; // default export assumed
import { CyberTitle } from './CyberTitle';

type NavLinkItem = {
  kind: 'link';
  label: string;
  icon: string; // either sprite frame name (e.g. "home") OR an image URL ("/icons/foo.svg" or "https://...")
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  const baseItems: NavItem[] = [
    { kind: 'link', label: 'Home', icon: 'home', to: '/game-map' },
    { kind: 'action', label: 'Settings', icon: 'settings', onClick: openSettings },
  ];

  const authItems: NavItem[] = [
    { kind: 'link', label: 'Leaderboard', icon: 'leaderboard', to: '/game-map/leaderboard' },
    { kind: 'link', label: 'Lives', icon: 'heart', to: '/game-map' },
    { kind: 'link', label: 'Profile', icon: 'profile', to: '/game-map/profile' },
  ];

  const navItems: NavItem[] = isAuthenticated
    ? [
        ...baseItems,
        ...authItems,
        {
          kind: 'action',
          label: 'Logout',
          icon: 'logout',
          onClick: () => {
            logout();
            navigate('/game-map');
          },
        },
      ]
    : [
        ...baseItems,
        {
          kind: 'action',
          label: 'Login',
          icon: 'login',
          onClick: openLogin,
        },
      ];

  // helper: detect if icon is a URL
  const isUrl = (s: string) => {
    return s.startsWith('/') || s.startsWith('http') || s.endsWith('.svg') || s.endsWith('.png') || s.endsWith('.jpg');
  };

  return (
    <nav
      className="flex justify-between items-center p-6
                  backdrop-blur-10px "
    >
      <CyberTitle size="sm">Match-3</CyberTitle>
      <ul className="flex gap-1 items-center">
        {navItems.map((item) => (
          <li key={item.label} className="flex items-center">
            {item.kind === 'link' ? (
              <Link
                to={item.to}
                className="flex items-center justify-center p-1  hover:scale-110 active:scale-95  transition-transform duration-300 ease-out  rounded"
                aria-label={item.label}
                title={item.label}
              >
                {isUrl(item.icon) ? (
                  <img src={item.icon} alt={item.label} className=" object-contain" />
                ) : (
                  <SpriteIcon name={item.icon} width={52} height={52} className="" alt={item.label} />
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="flex items-center justify-center p-1  hover:scale-110 active:scale-95  transition-transform duration-300 ease-out  rounded"
                aria-label={item.label}
                title={item.label}
              >
                {isUrl(item.icon) ? (
                  <img src={item.icon} alt={item.label} className=" object-contain" />
                ) : (
                  <SpriteIcon name={item.icon} width={52} height={52} className="" alt={item.label} />
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
