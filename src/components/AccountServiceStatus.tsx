import { backendReadiness } from '@/api/http';
import { useAccountReadiness } from '@/services/network/useAccountReadiness';
export default function AccountServiceStatus() {
  const status = useAccountReadiness();
  if (status === 'ready') return null;
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
