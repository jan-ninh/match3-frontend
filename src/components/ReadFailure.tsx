import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router';
import type { RequestError } from '@/api/transport';
export default function ReadFailure({ error, retry, title = 'Account unavailable' }: { error?: RequestError; retry?: () => void; title?: string }) {
  const { playDemo } = useAuth();
  const navigate = useNavigate();
  return (
    <div role="alert" className="text-center p-6 space-y-3">
      <p>{title}</p>
      <p>{error?.message}</p>
      {retry && (
        <button type="button" className="border rounded px-4 py-2" onClick={retry}>
          Retry
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
