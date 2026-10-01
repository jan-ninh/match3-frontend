import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useOverlays } from '@/features/overlays';
import { useAccountReadiness } from '@/services/network/useAccountReadiness';
import { useSlowPending } from '@/services/network/useSlowPending';
export default function AccountAvailability() {
  const { availability, session, error, retryAccount, playDemo } = useAuth();
  const { openLogin } = useOverlays();
  const navigate = useNavigate();
  const readiness = useAccountReadiness();
  const checking = availability === 'checking';
  const slow = useSlowPending(checking);
  const title =
    session === 'expired'
      ? 'Session expired'
      : checking
        ? slow && readiness !== 'ready'
          ? 'Starting account services…'
          : 'Restoring account…'
        : 'Account unavailable';
  return (
    <div className="account-availability text-center p-6 space-y-3" role="status" aria-live="polite">
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
      <p className="text-sm text-cyan-100/70">
        {checking
          ? slow && readiness !== 'ready'
            ? 'Demo is ready while account services wake up.'
            : 'Demo is available while we restore your account.'
          : 'Demo progress stays on this device and is not saved to your account.'}
      </p>
    </div>
  );
}
