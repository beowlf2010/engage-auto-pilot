
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

    try {
      const channelName = `conversation-updates-${profileId}-${Date.now()}`;
      
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: profileId }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            console.log('New conversation inserted:', payload);
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
          (payload) => {
            console.log('Conversation updated:', payload);
            onUpdate();
          }
        );

      channel.subscribe((status, err) => {
        console.log('Conversation channel status:', status);
        if (err) {
          console.error('Conversation channel error:', err);
        }
        if (status === 'SUBSCRIBED') {
          conversationChannelRef.current = channel;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('Conversation channel failed, will retry...');
          setTimeout(() => {
            setupConversationChannel(profileId, onUpdate);
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Error setting up conversation channel:', error);
    }
  }, [cleanupChannel]);

  const setupMessageChannel = useCallback((leadId: string, onUpdate: (leadId: string) => void) => {
    cleanupChannel(messageChannelRef, 'message');

    try {
      const channelName = `messages-${leadId}-${Date.now()}`;
      
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: leadId }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `lead_id=eq.${leadId}`
          },
          (payload) => {
            console.log(`New message for lead ${leadId}:`, payload);
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
          (payload) => {
            console.log(`Message updated for lead ${leadId}:`, payload);
            if (currentLeadIdRef.current === leadId) {
              onUpdate(leadId);
            }
          }
        );

      channel.subscribe((status, err) => {
        console.log('Message channel status:', status);
        if (err) {
          console.error('Message channel error:', err);
        }
        if (status === 'SUBSCRIBED') {
          messageChannelRef.current = channel;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('Message channel failed, will retry...');
          setTimeout(() => {
            setupMessageChannel(leadId, onUpdate);
          }, 3000);
        }
      });
    } catch (error) {
      console.error('Error setting up message channel:', error);
    }
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
