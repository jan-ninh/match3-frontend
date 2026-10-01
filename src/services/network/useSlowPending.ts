import { useEffect, useState } from 'react';

// Presentation delay only: requests and session verification start immediately.
export function useSlowPending(pending: boolean, delay = 1800) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(pending), pending ? delay : 0);
    return () => window.clearTimeout(timer);
  }, [pending, delay]);
  return pending && slow;
}
