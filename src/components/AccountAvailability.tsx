import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useOverlays } from '@/features/overlays';
export default function AccountAvailability() {
  const { availability, session, error, retryAccount, playDemo } = useAuth();
  const { openLogin } = useOverlays();
  const navigate = useNavigate();
  const title = session === 'expired' ? 'Session expired' : availability === 'checking' ? 'Checking account' : 'Account unavailable';
  return (
    <div className="text-center p-6 space-y-3" role="status">
      <p>{title}</p>
      {error && session !== 'expired' && <p>{error.message}</p>}
      {session === 'expired' ? (
        <button type="button" className="border rounded px-4 py-2" onClick={openLogin}>
          Sign in
        </button>
      ) : (
        availability !== 'checking' && (
          <button type="button" className="border rounded px-4 py-2" onClick={retryAccount}>
            Retry account
          </button>
        )
      )}
      <button
        type="button"
        className="border rounded px-4 py-2"
        onClick={() => {
          playDemo();
          navigate('/game-map');
        }}
      >
        Play Demo
      </button>
      <p>Demo progress stays on this device and is not saved to your account.</p>
    </div>
  );
}
