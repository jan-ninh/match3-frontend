import { Link } from 'react-router-dom';
import { useOverlays } from '@/overlays';

const Navbar = () => {
  const { openLogin, openSettings } = useOverlays();

  return (
    <nav>
      <ul>
        <li>
          <Link to="/game-map">Home</Link>
        </li>

        <li>
          <button type="button" onClick={openLogin}>
            log in
          </button>
        </li>

        <li>
          <Link to="/game-map/logout">log out</Link>
        </li>

        <li>
          <Link to="/game-map">hearts</Link>
        </li>

        <li>
          <Link to="/game-map/profile">profile</Link>
        </li>

        <li>
          <Link to="/game-map/leaderboard">leaderboard</Link>
        </li>

        <li>
          <button type="button" onClick={openSettings}>
            setting
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
