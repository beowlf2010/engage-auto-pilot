import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected: Date | null;
  reconnectAttempts: number;
  lastError: string | null;
}

interface UseEnhancedRealtimeMessagesProps {
  onMessageUpdate: (leadId: string) => void;
  onConversationUpdate: () => void;
}

export const useEnhancedRealtimeMessages = ({ 
  onMessageUpdate, 
  onConversationUpdate 
}: UseEnhancedRealtimeMessagesProps) => {
  const { profile } = useAuth();
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    lastConnected: null,
    reconnectAttempts: 0,
    lastError: null
  });

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 [ENHANCED RT] Cleaning up real-time subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    
    heartbeatRef.current = setInterval(() => {
      if (channelRef.current) {
        const channelState = channelRef.current.state;
        console.log('💓 [ENHANCED RT] Heartbeat check - Channel state:', channelState);
        
        if (channelState === 'closed' || channelState === 'errored') {
          console.log('🔄 [ENHANCED RT] Heartbeat detected disconnection, reconnecting...');
          setupRealtimeSubscription();
        }
      }
    }, 30000); // Check every 30 seconds
  }, []);

  const scheduleReconnect = useCallback((delayMs: number = 5000) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    console.log(`⏰ [ENHANCED RT] Scheduling reconnect in ${delayMs}ms`);
    reconnectTimeoutRef.current = setTimeout(() => {
      setupRealtimeSubscription();
    }, delayMs);
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    if (!profile) {
      console.log('❌ [ENHANCED RT] No profile available for subscription');
      return;
    }

    cleanup();
    
    setConnectionStatus(prev => ({
      ...prev,
      status: 'connecting'
    }));

    const currentAttempts = connectionStatus.reconnectAttempts;
    console.log(`📡 [ENHANCED RT] Setting up simplified real-time subscription (attempt ${currentAttempts + 1})`);
    
    // Simplified channel name - just use profile ID
    const channelName = `messages-${profile.id}`;
    const channel = supabase
      .channel(channelName, {
        config: {
          presence: { key: profile.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('📨 [ENHANCED RT] Database change received:', payload.eventType, payload);
          
          if (payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
            const message = payload.new as { lead_id: string; direction: string };
            
            // Always update UI for any conversation change
            onConversationUpdate();
            onMessageUpdate(message.lead_id);
            
            // Browser notification for new incoming messages only
            if (payload.eventType === 'INSERT' && message.direction === 'in') {
              console.log('🔔 [ENHANCED RT] New incoming message detected');
              window.dispatchEvent(new CustomEvent('unread-count-changed'));
              
              // Show browser notification if permitted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New message received', {
                  icon: '/favicon.ico',
                  tag: 'new-message'
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 [ENHANCED RT] Subscription status: ${status}`);
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('✅ [ENHANCED RT] Successfully connected to real-time!');
            setConnectionStatus({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0,
              lastError: null
            });
            startHeartbeat();
            break;
            
          case 'CHANNEL_ERROR':
            console.error('❌ [ENHANCED RT] Channel error - checking RLS policies and table permissions');
            setConnectionStatus(prev => ({
              ...prev,
              status: 'error',
              lastError: 'Channel configuration error',
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
            handleReconnection(currentAttempts);
            break;
            
          case 'TIMED_OUT':
            console.warn('⏰ [ENHANCED RT] Connection timed out - network or server issue');
            setConnectionStatus(prev => ({
              ...prev,
              status: 'error',
              lastError: 'Connection timeout',
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
            handleReconnection(currentAttempts);
            break;
            
          case 'CLOSED':
            console.log('🔒 [ENHANCED RT] Connection closed');
            setConnectionStatus(prev => ({
              ...prev,
              status: 'error',
              lastError: 'Connection closed'
            }));
            break;
        }
      });

    channelRef.current = channel;
  }, [profile, onMessageUpdate, onConversationUpdate, cleanup, startHeartbeat]);

  const handleReconnection = useCallback((currentAttempts: number) => {
    const maxAttempts = 3; // Reduced max attempts
    if (currentAttempts >= maxAttempts) {
      console.log(`🔄 [ENHANCED RT] Max attempts (${maxAttempts}) reached, switching to longer delay`);
      setConnectionStatus(prev => ({
        ...prev,
        reconnectAttempts: 0,
        status: 'error'
      }));
      // Try again in 30 seconds after max attempts
      scheduleReconnect(30000);
    } else {
      // Quick retry for first few attempts
      const delay = currentAttempts === 0 ? 2000 : 5000;
      scheduleReconnect(delay);
    }
  }, [scheduleReconnect]);

  // Setup subscription on mount and profile change
  useEffect(() => {
    setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription]);

  // Manual reconnection function
  const forceReconnect = useCallback(() => {
    console.log('🔄 [ENHANCED RT] Force reconnecting...');
    setConnectionStatus(prev => ({
      ...prev,
      reconnectAttempts: 0
    }));
    setupRealtimeSubscription();
  }, [setupRealtimeSubscription]);

  return {
    connectionStatus,
    forceReconnect,
    isConnected: connectionStatus.status === 'connected'
  };
};