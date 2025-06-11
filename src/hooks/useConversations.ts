
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
  const channelsRef = useRef<any[]>([]);

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
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    });
    channelsRef.current = [];
  };

  // Single effect to handle all real-time subscriptions
  useEffect(() => {
    if (!profile) return;

    // Cleanup any existing channels first
    cleanupChannels();

    // Create a single channel for conversation updates
    const conversationChannel = supabase
      .channel(`conversation-updates-${profile.id}-${Date.now()}`)
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
      )
      .subscribe();

    // Store channel reference
    channelsRef.current.push(conversationChannel);

    return cleanupChannels;
  }, [profile]);

  // Separate effect for current conversation messages
  useEffect(() => {
    if (!messages.length) return;

    const currentLeadId = messages[0]?.leadId;
    if (!currentLeadId) return;

    // Create unique channel name with timestamp to avoid conflicts
    const messageChannel = supabase
      .channel(`messages-${currentLeadId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${currentLeadId}`
        },
        () => {
          console.log(`New message for lead ${currentLeadId}, refreshing...`);
          loadMessages(currentLeadId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${currentLeadId}`
        },
        () => {
          console.log(`Message updated for lead ${currentLeadId}, refreshing...`);
          loadMessages(currentLeadId);
        }
      )
      .subscribe();

    // Store channel reference
    channelsRef.current.push(messageChannel);

    return () => {
      try {
        supabase.removeChannel(messageChannel);
        // Remove from ref array
        channelsRef.current = channelsRef.current.filter(ch => ch !== messageChannel);
      } catch (error) {
        console.error('Error removing message channel:', error);
      }
    };
  }, [messages]);

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
