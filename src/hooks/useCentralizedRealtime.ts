
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeCallbacks } from '@/types/realtime';

// Define types for payload data
interface ConversationPayload {
  lead_id?: string;
  [key: string]: any;
}

interface RealtimePayload {
  eventType: string;
  new?: ConversationPayload;
  old?: ConversationPayload;
}

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks) => {
  const channelRef = useRef<any>(null);
  const callbacksRef = useRef(callbacks);
  const isSubscribedRef = useRef(false);

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const setupRealtimeSubscriptions = useCallback(() => {
    if (channelRef.current || isSubscribedRef.current) {
      console.log('📡 Realtime already subscribed, skipping setup');
      return;
    }

    console.log('📡 Setting up enhanced realtime subscriptions');
    
    try {
      // Create a single channel for all subscriptions
      const channel = supabase.channel('inbox-updates', {
        config: { presence: { key: 'user' } }
      });

      // Enhanced conversations subscription with immediate refresh
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload: RealtimePayload) => {
          const leadId = payload.new?.lead_id || payload.old?.lead_id;
          console.log('📬 Realtime: Conversation change detected', payload.eventType, leadId);
          
          // Immediate callback execution for instant UI updates
          if (callbacksRef.current.onConversationUpdate) {
            setTimeout(() => callbacksRef.current.onConversationUpdate?.(), 0);
          }
          
          if (callbacksRef.current.onMessageUpdate && leadId) {
            setTimeout(() => callbacksRef.current.onMessageUpdate?.(leadId), 0);
          }
        }
      );

      // Enhanced leads subscription for unread count updates
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        (payload: RealtimePayload) => {
          const leadId = payload.new?.id;
          console.log('👤 Realtime: Lead update detected', leadId);
          
          // Immediate unread count refresh
          if (callbacksRef.current.onUnreadCountUpdate) {
            setTimeout(() => callbacksRef.current.onUnreadCountUpdate?.(), 0);
          }
          
          if (callbacksRef.current.onConversationUpdate) {
            setTimeout(() => callbacksRef.current.onConversationUpdate?.(), 0);
          }
        }
      );

      // Subscribe with enhanced error handling and immediate status updates
      channel.subscribe((status, err) => {
        console.log('📡 Enhanced realtime subscription status:', status);
        
        if (err) {
          console.error('❌ Realtime subscription error:', err);
          isSubscribedRef.current = false;
          // Retry subscription after short delay
          setTimeout(() => {
            if (!isSubscribedRef.current) {
              console.log('🔄 Retrying realtime subscription...');
              setupRealtimeSubscriptions();
            }
          }, 2000);
        } else if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced realtime subscriptions active');
          isSubscribedRef.current = true;
        }
      });

      channelRef.current = channel;

    } catch (error) {
      console.error('❌ Error setting up realtime subscriptions:', error);
      isSubscribedRef.current = false;
    }
  }, []);

  const cleanupSubscriptions = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 Cleaning up enhanced realtime subscriptions');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  }, []);

  // Setup subscriptions on mount
  useEffect(() => {
    setupRealtimeSubscriptions();
    
    return () => {
      cleanupSubscriptions();
    };
  }, [setupRealtimeSubscriptions, cleanupSubscriptions]);

  // Provide manual refresh capability
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refreshing all realtime callbacks');
    
    if (callbacksRef.current.onConversationUpdate) {
      callbacksRef.current.onConversationUpdate();
    }
    
    if (callbacksRef.current.onUnreadCountUpdate) {
      callbacksRef.current.onUnreadCountUpdate();
    }
  }, []);

  return { 
    forceRefresh,
    isConnected: isSubscribedRef.current,
    reconnect: setupRealtimeSubscriptions
  };
};
