import { Link } from 'react-router';

type NavItem = {
  label: string;
  icon: string;
  to?: string; // if exists → clickable
};

const navItems: NavItem[] = [
  { label: 'Home', icon: '/icons/home.svg', to: '/game-map' },
  { label: 'Login', icon: '/icons/login.svg', to: '/game-map/login' },
  { label: 'Logout', icon: '/icons/logout.svg', to: '/game-map/logout' },
  { label: 'Hearts', icon: '/icons/heart.svg' },
  { label: 'Leaderboard', icon: '/icons/cup.svg', to: '/game-map/leaderboard' },
  { label: 'Profile', icon: '/icons/user.svg', to: '/game-map/profile' },
  { label: 'Settings', icon: '/icons/setting.svg', to: '/game-map/setting' },
];

const Navbar = () => {
  return (
    <nav className="flex justify-between p-8">
      <h1>Match-3</h1>
      <ul className="flex justify-end space-x-6 items-center ">
        {navItems.map(({ label, icon, to }) => (
          <li key={label}>
            {to ? (
              <Link to={to} className="flex flex-col items-center hover:bg-blue-300 transition">
                <img src={icon} alt={label} className="w-9 h-9" />
              </Link>
            ) : (
              <span className="flex flex-col items-center cursor-default">
                <img src={icon} alt={label} className="w-9 h-9" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
