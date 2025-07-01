
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface UseRealtimeMessagesProps {
  onMessageUpdate: (leadId: string) => void;
  onConversationUpdate: () => void;
}

export const useRealtimeMessages = ({ onMessageUpdate, onConversationUpdate }: UseRealtimeMessagesProps) => {
  const { profile } = useAuth();
  const channelRef = useRef<any>(null);

  const setupRealtimeSubscription = useCallback(() => {
    if (!profile || channelRef.current) return;

    console.log('📡 Setting up real-time message subscription');
    
    const channel = supabase
      .channel('smart-inbox-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('📨 New message received via real-time:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
            const newMessage = payload.new as { lead_id: string; direction: string };
            
            // Trigger conversation list update
            onConversationUpdate();
            
            // Trigger specific lead message update
            onMessageUpdate(newMessage.lead_id);
            
            // Show browser notification for incoming messages
            if (newMessage.direction === 'in') {
              console.log('🔔 Incoming message detected, triggering notifications');
              window.dispatchEvent(new CustomEvent('unread-count-changed'));
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
          console.log('📝 Message updated via real-time:', payload);
          
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
        console.log('📡 Real-time subscription status:', status);
      });

    channelRef.current = channel;
  }, [profile, onMessageUpdate, onConversationUpdate]);

  const cleanupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 Cleaning up real-time subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    setupRealtimeSubscription();
    return cleanupRealtimeSubscription;
  }, [setupRealtimeSubscription, cleanupRealtimeSubscription]);

  return {
    reconnect: () => {
      cleanupRealtimeSubscription();
      setupRealtimeSubscription();
    }
  };
};
