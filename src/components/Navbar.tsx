import { Link } from 'react-router';
import { useOverlays } from '@/overlays';

type NavItem = {
  label: string;
  icon: string;
  to?: string; // if exists → clickable
  onClick?: () => void;
};

const Navbar = () => {
  const { openLogin, openSettings } = useOverlays();

  // Define all nav items here
  const navItems: NavItem[] = [
    { label: 'Home', icon: '/icons/home.svg', to: '/game-map' },
    { label: 'Login', icon: '/icons/login.svg', onClick: openLogin },
    { label: 'Logout', icon: '/icons/logout.svg', to: '/game-map/logout' },
    { label: 'Hearts', icon: '/icons/heart.svg' },
    { label: 'Leaderboard', icon: '/icons/cup.svg', to: '/game-map/leaderboard' },
    { label: 'Profile', icon: '/icons/user.svg', to: '/game-map/profile' },
    { label: 'Settings', icon: '/icons/setting.svg', onClick: openSettings },
  ];
  return (
    <nav className="flex justify-between p-8">
      <h1>Match-3</h1>
      <ul className="flex justify-end space-x-6 items-center ">
        {navItems.map(({ label, icon, to, onClick }) => (
          <li key={label}>
            {/* Use Link for all items */}
            <Link
              to={to || '#'} // if no 'to', use '#' so Link is valid
              onClick={(e) => {
                if (onClick) {
                  // If there's no 'to', prevent default navigation to keep user on page
                  if (!to) e.preventDefault();
                  onClick(); // open modal or run function
                }
              }}
              className="flex flex-col items-center p-1 hover:bg-blue-300 transition-colors rounded"
            >
              {/* Display icon */}
              <img src={icon} alt={label} className="w-9 h-9" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
