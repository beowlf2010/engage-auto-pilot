import { useEffect, useMemo, useState } from 'react';

interface NetworkStatusState {
  isOnline: boolean;
  isDegraded: boolean;
  lastUpdated?: Date;
}

export function useNetworkStatus(): NetworkStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setLastUpdated(new Date()); };
    const handleOffline = () => { setIsOnline(false); setLastUpdated(new Date()); };
    const handleHealth = (e: Event) => {
      const detail = (e as CustomEvent).detail as { isDegraded?: boolean; lastIssueAt?: number };
      if (typeof detail?.isDegraded === 'boolean') {
        setIsDegraded(detail.isDegraded);
        setLastUpdated(new Date());
      }
    };
    const handleIssue = () => setLastUpdated(new Date());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('network-health-changed', handleHealth as EventListener);
    window.addEventListener('network-issue', handleIssue as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-health-changed', handleHealth as EventListener);
      window.removeEventListener('network-issue', handleIssue as EventListener);
    };
  }, []);

  return useMemo(() => ({ isOnline, isDegraded, lastUpdated }), [isOnline, isDegraded, lastUpdated]);
}
