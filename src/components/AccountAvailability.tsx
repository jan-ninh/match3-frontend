import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router';
export default function AccountAvailability() {
  const { availability, error, retryAccount, playDemo, selected } = useAuth();
  const navigate = useNavigate();
  const title = availability === 'checking' ? 'Loading account...' : availability === 'rejected' ? 'Account request rejected' : 'Account unavailable';
  return (
    <div role="status" className="text-center p-6 space-y-3">
      <p>{title}</p>
      {error && <p>{error.message}</p>}
      {availability !== 'checking' && selected && (
        <button type="button" className="border rounded px-4 py-2" onClick={retryAccount}>
          Retry account
        </button>
      )}{' '}
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
      <p className="text-sm">Demo progress stays on this device and is not saved to your account.</p>
    </div>
  );
}
