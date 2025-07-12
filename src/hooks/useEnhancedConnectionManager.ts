import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastError: string | null;
}

interface UseEnhancedConnectionManagerProps {
  onMessageUpdate?: (leadId: string) => void;
  onConversationUpdate?: () => void;
  onUnreadCountUpdate?: () => void;
}

export const useEnhancedConnectionManager = (props: UseEnhancedConnectionManagerProps = {}) => {
  const { profile } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    status: 'connecting',
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10, // Increased from 5 to 10
    connectionQuality: 'excellent',
    lastError: null
  });

  const channelRef = useRef<any>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackPollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date>(new Date());

  // Enhanced reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    setConnectionState(prev => ({
      ...prev,
      status: 'reconnecting',
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    if (connectionState.reconnectAttempts >= connectionState.maxReconnectAttempts) {
      console.warn('🔴 [CONNECTION] Max reconnection attempts reached, switching to offline mode');
      setConnectionState(prev => ({
        ...prev,
        status: 'offline',
        isConnected: false,
        connectionQuality: 'critical',
        lastError: 'Maximum reconnection attempts exceeded'
      }));
      startFallbackPolling();
      return;
    }

    // Enhanced exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s, 32s, then 60s
    const baseDelay = 1000 * Math.pow(2, connectionState.reconnectAttempts);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 60000);
    
    console.log(`🔄 [CONNECTION] Scheduling reconnect in ${delay}ms (attempt ${connectionState.reconnectAttempts + 1})`);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connectionState.reconnectAttempts, connectionState.maxReconnectAttempts]);

  // Fallback polling when real-time fails
  const startFallbackPolling = useCallback(() => {
    if (fallbackPollingRef.current) {
      clearInterval(fallbackPollingRef.current);
    }

    console.log('📊 [CONNECTION] Starting fallback polling mode');
    
    fallbackPollingRef.current = setInterval(() => {
      console.log('🔄 [CONNECTION] Fallback poll refresh');
      if (props.onConversationUpdate) props.onConversationUpdate();
      if (props.onUnreadCountUpdate) props.onUnreadCountUpdate();
    }, 30000); // Poll every 30 seconds
  }, [props.onConversationUpdate, props.onUnreadCountUpdate]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackPollingRef.current) {
      clearInterval(fallbackPollingRef.current);
      fallbackPollingRef.current = null;
    }
  }, []);

  // Connection health check
  const startHealthCheck = useCallback(() => {
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
    }

    healthCheckTimerRef.current = setInterval(() => {
      const now = new Date();
      const timeSinceLastSync = now.getTime() - lastSyncRef.current.getTime();
      
      // Increased tolerance - if no sync for more than 3 minutes, consider connection stale
      if (timeSinceLastSync > 180000 && connectionState.isConnected) {
        console.warn('⚠️ [CONNECTION] Connection appears stale, forcing reconnect');
        setConnectionState(prev => ({
          ...prev,
          connectionQuality: 'poor',
          lastError: 'Connection stale - no data received'
        }));
        forceReconnect();
      }
    }, 60000); // Check every minute
  }, [connectionState.isConnected]);

  // Enhanced connection setup
  const connect = useCallback(() => {
    if (!profile) return;

    // Clean up existing connection
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setConnectionState(prev => ({ ...prev, status: 'connecting' }));

    console.log('🔗 [CONNECTION] Establishing enhanced real-time connection');

    const channel = supabase
      .channel('enhanced-inbox-connection', {
        config: {
          presence: { key: profile.id }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('📨 [CONNECTION] Real-time update received:', payload.eventType);
        lastSyncRef.current = new Date();

        if (payload.eventType === 'INSERT' && payload.new?.direction === 'in') {
          // Incoming message - high priority
          if (props.onMessageUpdate && payload.new?.lead_id) {
            props.onMessageUpdate(payload.new.lead_id);
          }
          if (props.onUnreadCountUpdate) {
            props.onUnreadCountUpdate();
          }
        } else {
          // Other updates - normal priority
          if (props.onConversationUpdate) {
            props.onConversationUpdate();
          }
        }
      })
      .subscribe((status, err) => {
        console.log('📡 [CONNECTION] Subscription status:', status, err);

        switch (status) {
          case 'SUBSCRIBED':
            setConnectionState(prev => ({
              ...prev,
              isConnected: true,
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0,
              connectionQuality: 'excellent',
              lastError: null
            }));
            stopFallbackPolling();
            startHealthCheck();
            lastSyncRef.current = new Date();
            break;

          case 'CHANNEL_ERROR':
            setConnectionState(prev => ({
              ...prev,
              isConnected: false,
              status: 'failed',
              lastError: 'Channel error occurred'
            }));
            scheduleReconnect();
            break;
            
          case 'TIMED_OUT':
            setConnectionState(prev => ({
              ...prev,
              isConnected: false,
              status: 'failed',
              lastError: 'Connection timed out'
            }));
            scheduleReconnect();
            break;
            
          case 'CLOSED':
            setConnectionState(prev => ({
              ...prev,
              isConnected: false,
              status: 'failed',
              lastError: 'Connection closed unexpectedly'
            }));
            scheduleReconnect();
            break;
        }
      });

    channelRef.current = channel;
  }, [profile, props, scheduleReconnect, stopFallbackPolling, startHealthCheck]);

  // Force reconnect (resets attempt counter)
  const forceReconnect = useCallback(() => {
    console.log('🔄 [CONNECTION] Force reconnect requested');
    
    // Clear all timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // Reset connection state
    setConnectionState(prev => ({
      ...prev,
      reconnectAttempts: 0,
      status: 'connecting'
    }));

    connect();
  }, [connect]);

  // Force sync - manual refresh
  const forceSync = useCallback(() => {
    console.log('🔄 [CONNECTION] Force sync requested');
    lastSyncRef.current = new Date();
    if (props.onConversationUpdate) props.onConversationUpdate();
    if (props.onUnreadCountUpdate) props.onUnreadCountUpdate();
  }, [props.onConversationUpdate, props.onUnreadCountUpdate]);

  // Initialize connection
  useEffect(() => {
    if (profile) {
      connect();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
      if (fallbackPollingRef.current) {
        clearInterval(fallbackPollingRef.current);
      }
    };
  }, [profile, connect]);

  return {
    connectionState,
    forceReconnect,
    forceSync,
    isOnline: connectionState.status === 'connected',
    isOffline: connectionState.status === 'offline'
  };
};
