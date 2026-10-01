import { Link, useNavigate } from 'react-router';
import { useOverlays } from '@/features/overlays';
import { useAuth } from '@/context/AuthContext';
import SpriteIcon from '@/components/SpriteIcon'; // default export assumed
import { CyberTitle } from './CyberTitle';
import AccountServiceStatus from './AccountServiceStatus';

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
  const { mode, logout, resumeAccount, playDemo } = useAuth();
  const navigate = useNavigate();

  const isAccount = mode === 'account';

  const baseItems: NavItem[] = [
    { kind: 'link', label: 'Map', icon: 'home', to: '/game-map' },
    { kind: 'link', label: 'Leaderboard', icon: 'leaderboard', to: '/game-map/leaderboard' },
    { kind: 'action', label: 'Settings', icon: 'settings', onClick: openSettings },
  ];

  if (isAccount)
    baseItems.push({
      kind: 'action',
      label: 'Play Demo',
      icon: 'play',
      onClick: () => {
        playDemo();
        navigate('/game-map');
      },
    });
  else
    baseItems.push({
      kind: 'action',
      label: 'Account',
      icon: 'profile',
      onClick: () => {
        resumeAccount();
        navigate('/game-map');
      },
    });

  const authItems: NavItem[] = [{ kind: 'link', label: 'Profile', icon: 'profile', to: '/game-map/profile' }];

  const navItems: NavItem[] = isAccount
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
    <>
      <nav className="portfolio-nav" aria-label="Main navigation">
        <Link to="/" className="portfolio-brand" aria-label="Match-3 home">
          <CyberTitle size="sm">Match-3</CyberTitle>
        </Link>
        <ul className="portfolio-nav-items">
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
                    <img src={item.icon} alt="" className=" object-contain" />
                  ) : (
                    <SpriteIcon name={item.icon} width={36} height={36} className="" alt="" />
                  )}
                  <span className="nav-label">{item.label}</span>
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
                    <img src={item.icon} alt="" className=" object-contain" />
                  ) : (
                    <SpriteIcon name={item.icon} width={36} height={36} className="" alt="" />
                  )}
                  <span className="nav-label">{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <AccountServiceStatus />
    </>
  );
}
