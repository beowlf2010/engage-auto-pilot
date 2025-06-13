
import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeChannels = () => {
  const conversationChannelRef = useRef<any>(null);
  const messageChannelRef = useRef<any>(null);
  const currentLeadIdRef = useRef<string | null>(null);

  const cleanupChannel = useCallback((channelRef: React.MutableRefObject<any>, channelType: string) => {
    if (channelRef.current) {
      try {
        console.log(`Removing existing ${channelType} channel`);
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error(`Error removing ${channelType} channel:`, error);
      }
      channelRef.current = null;
    }
  }, []);

  const setupConversationChannel = useCallback((profileId: string, onUpdate: () => void) => {
    cleanupChannel(conversationChannelRef, 'conversation');

    const channelName = `conversation-updates-${profileId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          console.log('New conversation inserted, refreshing...');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          console.log('Conversation updated, refreshing...');
          onUpdate();
        }
      );

    channel.subscribe((status) => {
      console.log('Conversation channel status:', status);
      if (status === 'SUBSCRIBED') {
        conversationChannelRef.current = channel;
      }
    });
  }, [cleanupChannel]);

  const setupMessageChannel = useCallback((leadId: string, onUpdate: (leadId: string) => void) => {
    cleanupChannel(messageChannelRef, 'message');

    const channelName = `messages-${leadId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          console.log(`New message for lead ${leadId}, refreshing...`);
          if (currentLeadIdRef.current === leadId) {
            onUpdate(leadId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          console.log(`Message updated for lead ${leadId}, refreshing...`);
          if (currentLeadIdRef.current === leadId) {
            onUpdate(leadId);
          }
        }
      );

    channel.subscribe((status) => {
      console.log('Message channel status:', status);
      if (status === 'SUBSCRIBED') {
        messageChannelRef.current = channel;
      }
    });
  }, [cleanupChannel]);

  const setCurrentLeadId = useCallback((leadId: string | null) => {
    currentLeadIdRef.current = leadId;
  }, []);

  const cleanupAllChannels = useCallback(() => {
    cleanupChannel(conversationChannelRef, 'conversation');
    cleanupChannel(messageChannelRef, 'message');
  }, [cleanupChannel]);

  return {
    setupConversationChannel,
    setupMessageChannel,
    setCurrentLeadId,
    cleanupAllChannels
  };
};
