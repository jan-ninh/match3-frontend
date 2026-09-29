import { useAuth } from '@/context/AuthContext';
import { useGuest } from '@/context/GuestContext';

export default function GuestStatus() {
  const { user } = useAuth();
  const { persistence, recovered, conflict } = useGuest();
  if (user) return null;
  return (
    <p role="status" className="text-center text-sm text-cyan-100/70">
      Demo · {persistence === 'device' ? 'saved on this device' : 'this visit only'}
      {conflict && (
        <span role="alert" className="block">
          Guest progress changed in another tab. This attempt will not overwrite it.{' '}
          <button type="button" onClick={() => window.location.reload()} className="underline">
            Reload guest save
          </button>
        </span>
      )}
      {recovered && <span className="block">The guest save could not be restored. A fresh run was started.</span>}
    </p>
  );
}
