
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
    
    const channel = supabase
      .channel(`smart-inbox-messages-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new) {
            const newMessage = payload.new as { lead_id: string; direction: string };
            
            // Trigger conversation list update
            onConversationUpdate();
            
            // Trigger specific lead message update
            onMessageUpdate(newMessage.lead_id);
            
            // Show browser notification for incoming messages
            if (newMessage.direction === 'in') {
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
      .subscribe();

    channelRef.current = channel;
  }, [profile, onMessageUpdate, onConversationUpdate]);

  const cleanupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
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
