
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations } from '@/services/conversationsService';
import { fetchMessages, sendMessage as sendMessageService } from '@/services/messagesService';
import type { ConversationData, MessageData } from '@/types/conversation';

export const useConversationData = () => {
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

  return {
    conversations,
    messages,
    loading,
    setMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    profile
  };
};
