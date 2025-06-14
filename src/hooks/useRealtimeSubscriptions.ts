
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IncomingMessage {
  id: string;
  lead_id: string;
  direction: 'in' | 'out';
  body: string;
  sent_at: string;
}

interface UseRealtimeSubscriptionsProps {
  onConversationUpdate: () => void;
  onMessageUpdate: (leadId: string) => void;
  currentLeadId: string | null;
}

export const useRealtimeSubscriptions = ({
  onConversationUpdate,
  onMessageUpdate,
  currentLeadId
}: UseRealtimeSubscriptionsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  const handleIncomingMessage = useCallback(async (payload: any) => {
    const newMessage = payload.new as IncomingMessage;
    console.log('New incoming message:', newMessage);

    try {
      onConversationUpdate();

      if (currentLeadId === newMessage.lead_id) {
        onMessageUpdate(newMessage.lead_id);
      }

      const { data: leadData } = await supabase
        .from('leads')
        .select('first_name, last_name, salesperson_id')
        .eq('id', newMessage.lead_id)
        .single();

      if (leadData && newMessage.direction === 'in') {
        const leadName = `${leadData.first_name} ${leadData.last_name}`;
        
        const isForCurrentUser = leadData.salesperson_id === profile?.id || 
                               !leadData.salesperson_id ||
                               profile?.role === 'manager' || 
                               profile?.role === 'admin';

        if (isForCurrentUser) {
          toast({
            title: `📱 New message from ${leadName}`,
            description: newMessage.body.substring(0, 100) + (newMessage.body.length > 100 ? '...' : ''),
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }, [currentLeadId, onConversationUpdate, onMessageUpdate, profile, toast]);

  useEffect(() => {
    if (!profile) return;

    if (channelRef.current) {
      try {
        console.log('Removing existing unified channel');
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing existing unified channel:', error);
      }
      channelRef.current = null;
    }

    const channelName = `unified-inbox-${profile.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        handleIncomingMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        handleIncomingMessage
      );

    channel.subscribe((status) => {
      console.log('Unified inbox channel status:', status);
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        console.log('Unified inbox channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Unified inbox channel error');
        channelRef.current = null;
      } else if (status === 'CLOSED') {
        console.log('Unified inbox channel closed');
        channelRef.current = null;
      }
    });

    return () => {
      if (channelRef.current) {
        try {
          console.log('Cleaning up unified inbox channel');
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.error('Error removing unified inbox channel:', error);
        }
      }
    };
  }, [profile?.id, handleIncomingMessage]);

  return null;
};
