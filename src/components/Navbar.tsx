import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/game-map">Home</Link>
          </li>
          <li>
            <Link to="/game-map/login">log in</Link>
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
            <Link to="/game-map/setting">setting</Link>
          </li>
        </ul>
      </nav>
    </>
  );
};
export default Navbar;
