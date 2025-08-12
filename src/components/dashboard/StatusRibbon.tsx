import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Radio, Activity } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';

interface StatusRibbonProps {
  isStale?: boolean;
  hasError?: boolean;
}

export const StatusRibbon: React.FC<StatusRibbonProps> = ({ isStale, hasError }) => {
  const { isOnline, isDegraded } = useNetworkStatus();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(() => {
    try {
      // Prefer explicit API if available
      // @ts-ignore - handle optional methods gracefully
      if (typeof stableRealtimeManager.isConnected === 'function') {
        // @ts-ignore
        return Boolean(stableRealtimeManager.isConnected());
      }
      // @ts-ignore
      if (typeof stableRealtimeManager.getConnectionStatus === 'function') {
        // @ts-ignore
        return Boolean(stableRealtimeManager.getConnectionStatus().isConnected);
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    // @ts-ignore - addConnectionListener may not exist in older managers
    const unsubscribe = stableRealtimeManager.addConnectionListener
      ? // @ts-ignore
        stableRealtimeManager.addConnectionListener((connected: boolean) => {
          setIsRealtimeConnected(Boolean(connected));
        })
      : () => {};

    return () => {
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge
        variant="outline"
        title={isOnline ? (isDegraded ? 'Online but degraded' : 'All good') : 'Browser offline'}
      >
        {isOnline ? (
          <Wifi className="h-3 w-3 mr-1" />
        ) : (
          <WifiOff className="h-3 w-3 mr-1" />
        )}
        {isOnline ? (isDegraded ? 'Network: Degraded' : 'Network: Online') : 'Network: Offline'}
      </Badge>

      <Badge
        variant="outline"
        title={isRealtimeConnected ? 'Realtime live' : 'Falling back to polling'}
      >
        <Radio className="h-3 w-3 mr-1" />
        Realtime: {isRealtimeConnected ? 'Live' : 'Polling'}
      </Badge>

      <Badge
        variant="outline"
        title={hasError ? 'Some data sources had errors' : isStale ? 'Data is stale' : 'Data fresh'}
      >
        <Activity className="h-3 w-3 mr-1" />
        Data: {hasError ? 'Issue' : isStale ? 'Stale' : 'OK'}
      </Badge>
    </div>
  );
};
