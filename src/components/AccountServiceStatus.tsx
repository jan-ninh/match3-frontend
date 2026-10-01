import { backendReadiness } from '@/api/http';
import { useAccountReadiness } from '@/services/network/useAccountReadiness';
import { useSlowPending } from '@/services/network/useSlowPending';
import { useAuth } from '@/context/AuthContext';
export default function AccountServiceStatus() {
  const status = useAccountReadiness();
  const { mode } = useAuth();
  const slow = useSlowPending(status !== 'ready' && status !== 'unavailable');
  // AccountAvailability owns restoration messaging; never show competing banners.
  if (status === 'ready' || mode === 'account' || (status !== 'unavailable' && !slow)) return null;
  return (
    <div className="text-sm text-center py-2" role="status">
      {status === 'unavailable' ? (
        <>
          <p>Account services unavailable. Demo is still playable.</p>
          <button type="button" className="underline" onClick={backendReadiness.retry}>
            Retry account services
          </button>
        </>
      ) : (
        <p>Starting account services… Demo is ready to play.</p>
      )}
    </div>
  );
}
