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
    console.log(`📡 [ENHANCED RT] Setting up enhanced real-time subscription (attempt ${currentAttempts + 1})`);
    
    const channelName = `enhanced-messages-${profile.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('📨 [ENHANCED RT] New message received:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
            const newMessage = payload.new as { lead_id: string; direction: string };
            
            // Immediate UI updates
            onConversationUpdate();
            onMessageUpdate(newMessage.lead_id);
            
            // Browser notification for incoming messages
            if (newMessage.direction === 'in') {
              console.log('🔔 [ENHANCED RT] Incoming message detected');
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('📝 [ENHANCED RT] Message updated:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
            const updatedMessage = payload.new as { lead_id: string; read_at?: string };
            
            // If message was marked as read, update counts
            if (updatedMessage.read_at && !payload.old?.read_at) {
              onConversationUpdate();
              window.dispatchEvent(new CustomEvent('unread-count-changed'));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 [ENHANCED RT] Subscription status: ${status}`);
        
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus(prev => ({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0,
              lastError: null
            }));
            startHeartbeat();
            break;
            
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
          case 'CLOSED':
            setConnectionStatus(prev => ({
              ...prev,
              status: 'error',
              lastError: `Connection ${status}`,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
            
            // Reset attempts after max attempts to prevent infinite backoff
            const maxAttempts = 5;
            if (currentAttempts >= maxAttempts) {
              console.log(`🔄 [ENHANCED RT] Max attempts (${maxAttempts}) reached, resetting and trying with shorter delay`);
              setConnectionStatus(prev => ({
                ...prev,
                reconnectAttempts: 0
              }));
              scheduleReconnect(5000); // Reset to 5 second delay
            } else {
              // Exponential backoff for reconnection - cap at 30 seconds instead of 60
              const delay = Math.min(5000 * Math.pow(2, currentAttempts), 30000);
              scheduleReconnect(delay);
            }
            break;
        }
      });

    channelRef.current = channel;
  }, [profile, onMessageUpdate, onConversationUpdate, cleanup, startHeartbeat, scheduleReconnect]);

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