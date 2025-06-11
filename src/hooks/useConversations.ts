
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations } from '@/services/conversationsService';
import { fetchMessages, sendMessage as sendMessageService } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import type { ConversationData, MessageData } from '@/types/conversation';

export const useConversations = () => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const channelsRef = useRef<Set<string>>(new Set());
  const currentLeadIdRef = useRef<string | null>(null);

  const loadConversations = async () => {
    if (!profile) return;

    try {
      const conversationsData = await fetchConversations(profile);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (leadId: string) => {
    try {
      const messagesData = await fetchMessages(leadId);
      setMessages(messagesData);
      currentLeadIdRef.current = leadId;
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
    try {
      await sendMessageService(leadId, body, profile, aiGenerated);
      
      // Refresh messages and conversations to show updated status
      await loadMessages(leadId);
      await loadConversations();
    } catch (error) {
      console.error('Error in sendMessage:', error);
    }
  };

  // Cleanup function to remove all channels
  const cleanupChannels = () => {
    console.log('Cleaning up channels:', Array.from(channelsRef.current));
    channelsRef.current.forEach(channelName => {
      try {
        const channel = supabase.getChannel(channelName);
        if (channel) {
          supabase.removeChannel(channel);
        }
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    });
    channelsRef.current.clear();
  };

  // Single effect to handle all real-time subscriptions
  useEffect(() => {
    if (!profile) return;

    // Cleanup any existing channels first
    cleanupChannels();

    // Create unique channel names
    const conversationChannelName = `conversation-updates-${profile.id}-${Date.now()}`;
    const messageChannelName = currentLeadIdRef.current 
      ? `messages-${currentLeadIdRef.current}-${Date.now()}`
      : null;

    // Create conversation updates channel
    const conversationChannel = supabase
      .channel(conversationChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          console.log('New conversation inserted, refreshing...');
          loadConversations();
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
          loadConversations();
        }
      );

    // Subscribe to conversation channel
    conversationChannel.subscribe((status) => {
      console.log('Conversation channel status:', status);
      if (status === 'SUBSCRIBED') {
        channelsRef.current.add(conversationChannelName);
      }
    });

    // Create message channel if we have a current lead
    if (messageChannelName && currentLeadIdRef.current) {
      const messageChannel = supabase
        .channel(messageChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `lead_id=eq.${currentLeadIdRef.current}`
          },
          () => {
            console.log(`New message for lead ${currentLeadIdRef.current}, refreshing...`);
            if (currentLeadIdRef.current) {
              loadMessages(currentLeadIdRef.current);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `lead_id=eq.${currentLeadIdRef.current}`
          },
          () => {
            console.log(`Message updated for lead ${currentLeadIdRef.current}, refreshing...`);
            if (currentLeadIdRef.current) {
              loadMessages(currentLeadIdRef.current);
            }
          }
        );

      // Subscribe to message channel
      messageChannel.subscribe((status) => {
        console.log('Message channel status:', status);
        if (status === 'SUBSCRIBED') {
          channelsRef.current.add(messageChannelName);
        }
      });
    }

    return cleanupChannels;
  }, [profile, currentLeadIdRef.current]);

  useEffect(() => {
    if (profile) {
      loadConversations();
    }
  }, [profile]);

  return { 
    conversations, 
    messages, 
    loading, 
    fetchMessages: loadMessages, 
    sendMessage,
    refetch: loadConversations 
  };
};
