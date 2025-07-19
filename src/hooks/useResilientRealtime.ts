
import { useEffect, useState, useCallback } from 'react';
import { resilientRealtimeManager } from '@/services/resilientRealtimeManager';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastError: string | null;
  disconnectReason: string | null;
}

interface UseResilientRealtimeProps {
  onConversationUpdate?: () => void;
  onMessageUpdate?: (leadId: string) => void;
  onUnreadCountUpdate?: () => void;
}

export const useResilientRealtime = (props: UseResilientRealtimeProps = {}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    resilientRealtimeManager.getConnectionState()
  );

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('🔄 [RESILIENT REALTIME HOOK] Received update:', payload.eventType);

    // Handle different types of updates
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'POLL_UPDATE') {
      if (payload.table === 'conversations') {
        props.onConversationUpdate?.();
        
        if (payload.new?.lead_id) {
          props.onMessageUpdate?.(payload.new.lead_id);
        }
        
        // Check if this affects unread counts
        if (payload.new?.direction === 'in' || payload.new?.read_at !== payload.old?.read_at) {
          props.onUnreadCountUpdate?.();
        }
      }
    }
  }, [props]);

  useEffect(() => {
    console.log('🔗 [RESILIENT REALTIME HOOK] Setting up subscriptions');

    // Subscribe to conversation updates
    const unsubscribe = resilientRealtimeManager.subscribe({
      id: 'conversations-updates',
      callback: handleRealtimeUpdate,
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    // Listen to connection state changes
    const removeConnectionListener = resilientRealtimeManager.addConnectionListener(setConnectionState);

    return () => {
      console.log('🔌 [RESILIENT REALTIME HOOK] Cleaning up subscriptions');
      unsubscribe();
      removeConnectionListener();
    };
  }, [handleRealtimeUpdate]);

  const forceReconnect = useCallback(() => {
    resilientRealtimeManager.forceReconnect();
  }, []);

  const getHealthStatus = useCallback(() => {
    return resilientRealtimeManager.getHealthStatus();
  }, []);

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    forceReconnect,
    getHealthStatus
  };
};
