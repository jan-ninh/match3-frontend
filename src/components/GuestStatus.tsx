import { useAuth } from '@/context/AuthContext';
import { useGuest } from '@/context/GuestContext';

export default function GuestStatus() {
  const { mode, logoutUnconfirmed } = useAuth();
  const { recovered, conflict } = useGuest();

  if (mode !== 'demo' || (!conflict && !logoutUnconfirmed && !recovered)) return null;

  return (
    <p role="status" className="text-center text-sm text-cyan-100/70">
      {conflict && (
        <span role="alert" className="block">
          Guest progress changed in another tab. This attempt will not overwrite it.{' '}
          <button type="button" onClick={() => window.location.reload()} className="underline">
            Reload guest save
          </button>
        </span>
      )}
      {logoutUnconfirmed && <span className="block">Signed out on this device. Server sign-out could not be confirmed.</span>}
      {recovered && <span className="block">The guest save could not be restored. A fresh run was started.</span>}
    </p>
  );
}
