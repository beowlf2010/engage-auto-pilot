
import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchConversations, fetchMessages } from '@/services/conversationsService';
import { sendMessage as sendMessageService } from '@/services/messagesService';
import type { ConversationData, MessageData } from '@/types/conversation';

export const useConversationOperations = () => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const loadConversations = useCallback(async (retryCount = 0) => {
    if (!profile) return;

    const maxRetries = 3;
    try {
      console.log('Loading conversations, attempt:', retryCount + 1);
      setError(null);
      const conversationsData = await fetchConversations(profile);
      setConversations(conversationsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      
      if (retryCount >= maxRetries) {
        console.log('Max retries reached, stopping attempts');
        setError('Unable to load conversations. Please refresh the page.');
        setLoading(false);
        return;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log(`Retrying conversation fetch (attempt ${retryCount + 1}/${maxRetries})`);
        
        const baseDelay = Math.pow(2, retryCount) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        setTimeout(() => {
          loadConversations(retryCount + 1);
        }, delay);
        
        return;
      }
      
      setError('Unable to load conversations. Please check your connection.');
      setLoading(false);
    }
  }, [profile]);

  const loadMessages = useCallback(async (leadId: string, retryCount = 0) => {
    try {
      console.log('Loading messages for lead:', leadId);
      setError(null);
      const messagesData = await fetchMessages(leadId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      
      if (retryCount < 2 && error instanceof TypeError && error.message.includes('fetch')) {
        console.log(`Retrying message fetch (attempt ${retryCount + 1})`);
        
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          loadMessages(leadId, retryCount + 1);
        }, delay);
        
        return;
      }
      
      setError('Unable to load messages for this conversation.');
    }
  }, []);

  const sendMessage = async (leadId: string, body: string, aiGenerated = false) => {
    try {
      setError(null);
      await sendMessageService(leadId, body, profile, aiGenerated);
      
      await loadMessages(leadId);
      await loadConversations();
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setError('Failed to send message. Please try again.');
      throw error;
    }
  };

  const manualRefresh = useCallback(() => {
    setError(null);
    setLoading(true);
    loadConversations(0);
  }, [loadConversations]);

  return {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh
  };
};
