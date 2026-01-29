import { Link } from 'react-router-dom';

type NavItem = {
  label: string;
  icon: string;
  to?: string;
  clickable: boolean;
};

const navItems: NavItem[] = [
  { label: 'Home', icon: '/icons/home.svg', to: '/game-map', clickable: true },
  { label: 'Login', icon: '/icons/login.svg', to: '/game-map/login', clickable: true },
  { label: 'Logout', icon: '/icons/logout.svg', to: '/game-map/logout', clickable: true },
  { label: 'Hearts', icon: '/icons/heart.svg', clickable: false },
  { label: 'Leaderboard', icon: '/icons/cup.svg', to: '/game-map/leaderboard', clickable: true },
  { label: 'Profile', icon: '/icons/user.svg', to: '/game-map/profile', clickable: true },
  { label: 'Settings', icon: '/icons/setting.svg', to: '/game-map/setting', clickable: true },
];

const Navbar = () => {
  return (
    <nav className="flex justify-between p-8">
      <h1>Match-3</h1>
      <ul className="flex justify-end space-x-6 items-center ">
        {navItems.map(({ label, icon, to, clickable }) => (
          <li key={label}>
            {clickable && to ? (
              <Link to={to} className="flex flex-col items-center hover:bg-blue-300 transition">
                <img src={icon} alt={label} className="w-9 h-9" />
              </Link>
            ) : (
              <div className="flex flex-col items-center cursor-default">
                <img src={icon} alt={label} className="w-9 h-9" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
