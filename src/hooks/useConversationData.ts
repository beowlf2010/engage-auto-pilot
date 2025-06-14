
import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations } from '@/services/conversationsService';
import { fetchMessages, sendMessage as sendMessageService } from '@/services/messagesService';
import type { ConversationData, MessageData } from '@/types/conversation';

export const useConversationData = () => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const { profile } = useAuth();

  const loadConversations = useCallback(async () => {
    if (!profile) {
      console.log('No profile available for loading conversations');
      return;
    }

    try {
      console.log('Loading conversations for profile:', profile.id);
      const conversationsData = await fetchConversations(profile);
      setConversations(conversationsData);
      console.log('Loaded conversations:', conversationsData.length);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadMessages = useCallback(async (leadId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      console.log('Loading messages for lead:', leadId);
      const messagesData = await fetchMessages(leadId);
      setMessages(messagesData);
      console.log('Loaded messages:', messagesData.length);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessagesError(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (leadId: string, body: string, aiGenerated = false) => {
    try {
      console.log('Sending message:', { leadId, body, aiGenerated, profile: !!profile });
      
      if (!profile) {
        throw new Error('No profile available');
      }

      const result = await sendMessageService(leadId, body, profile, aiGenerated);
      console.log('Message sent result:', result);
      
      // Refresh messages and conversations to show updated status
      await loadMessages(leadId);
      await loadConversations();
      
      return result;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [profile, loadMessages, loadConversations]);

  return {
    conversations,
    messages,
    loading,
    messagesLoading,
    messagesError,
    setMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    profile
  };
};
