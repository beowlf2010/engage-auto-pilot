
import { useEffect, useState, useCallback } from 'react';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';

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
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    status: 'connecting',
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,
    connectionQuality: 'good',
    lastError: null,
    disconnectReason: null
  });

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('🔄 [RESILIENT REALTIME HOOK] Received update:', payload.eventType);

    // Handle different types of updates
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
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
    console.log('🔗 [RESILIENT REALTIME HOOK] Setting up stable subscriptions');

    // Subscribe to conversation updates using stable manager
    const unsubscribe = stableRealtimeManager.subscribe({
      id: 'resilient-conversations-updates',
      callback: handleRealtimeUpdate,
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    // Update connection state based on stable manager
    const updateConnectionState = () => {
      const status = stableRealtimeManager.getConnectionStatus();
      setConnectionState(prev => ({
        ...prev,
        isConnected: status.isConnected,
        status: status.isConnected ? 'connected' : 'connecting',
        lastConnected: status.isConnected ? new Date() : prev.lastConnected,
        reconnectAttempts: status.connectionAttempts,
        connectionQuality: status.healthStatus.networkQuality || 'good'
      }));
    };

    // Check connection status periodically
    const statusInterval = setInterval(updateConnectionState, 2000);
    updateConnectionState(); // Initial check

    return () => {
      console.log('🔌 [RESILIENT REALTIME HOOK] Cleaning up stable subscriptions');
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [handleRealtimeUpdate]);

  const forceReconnect = useCallback(() => {
    stableRealtimeManager.forceReconnect();
  }, []);

  const getHealthStatus = useCallback(() => {
    return stableRealtimeManager.getConnectionStatus().healthStatus;
  }, []);

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    forceReconnect,
    getHealthStatus
  };
};
