
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
  const conversationChannelRef = useRef<any>(null);
  const messageChannelRef = useRef<any>(null);
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
      
      // Set up message channel for this specific lead
      setupMessageChannel(leadId);
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

  // Setup conversation channel (once per profile)
  const setupConversationChannel = () => {
    if (!profile) return;

    // Cleanup existing conversation channel
    if (conversationChannelRef.current) {
      try {
        console.log('Removing existing conversation channel');
        supabase.removeChannel(conversationChannelRef.current);
      } catch (error) {
        console.error('Error removing conversation channel:', error);
      }
      conversationChannelRef.current = null;
    }

    const channelName = `conversation-updates-${profile.id}-${Date.now()}`;
    
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

    channel.subscribe((status) => {
      console.log('Conversation channel status:', status);
      if (status === 'SUBSCRIBED') {
        conversationChannelRef.current = channel;
      }
    });
  };

  // Setup message channel for specific lead
  const setupMessageChannel = (leadId: string) => {
    // Cleanup existing message channel
    if (messageChannelRef.current) {
      try {
        console.log('Removing existing message channel');
        supabase.removeChannel(messageChannelRef.current);
      } catch (error) {
        console.error('Error removing message channel:', error);
      }
      messageChannelRef.current = null;
    }

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
            loadMessages(leadId);
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
            loadMessages(leadId);
          }
        }
      );

    channel.subscribe((status) => {
      console.log('Message channel status:', status);
      if (status === 'SUBSCRIBED') {
        messageChannelRef.current = channel;
      }
    });
  };

  // Setup conversation channel when profile is available
  useEffect(() => {
    if (profile) {
      setupConversationChannel();
      loadConversations();
    }

    return () => {
      // Cleanup both channels on unmount
      if (conversationChannelRef.current) {
        try {
          console.log('Cleaning up conversation channel');
          supabase.removeChannel(conversationChannelRef.current);
        } catch (error) {
          console.error('Error removing conversation channel:', error);
        }
      }
      if (messageChannelRef.current) {
        try {
          console.log('Cleaning up message channel');
          supabase.removeChannel(messageChannelRef.current);
        } catch (error) {
          console.error('Error removing message channel:', error);
        }
      }
    };
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
