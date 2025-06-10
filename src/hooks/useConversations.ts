
import { useState, useEffect } from 'react';
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

  // Set up real-time listeners for conversation updates
  useEffect(() => {
    if (!profile) return;

    // Listen for new messages to refresh conversations list
    const conversationChannel = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          // Refresh conversations when new messages arrive
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
          // Refresh conversations when messages are updated
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
    };
  }, [profile]);

  // Set up real-time listener for current conversation messages
  useEffect(() => {
    if (!messages.length) return;

    const currentLeadId = messages[0]?.leadId;
    if (!currentLeadId) return;

    const messageChannel = supabase
      .channel(`messages-${currentLeadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${currentLeadId}`
        },
        () => {
          // Refresh messages for current conversation
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
          // Refresh messages when status updates
          loadMessages(currentLeadId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
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
