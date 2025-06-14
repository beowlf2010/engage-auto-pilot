
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
  };

  const loadMessages = async (leadId: string) => {
    try {
      console.log('Loading messages for lead:', leadId);
      const messagesData = await fetchMessages(leadId);
      setMessages(messagesData);
      console.log('Loaded messages:', messagesData.length);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
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
