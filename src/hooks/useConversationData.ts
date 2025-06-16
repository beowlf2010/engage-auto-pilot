
import { useState, useCallback } from 'react';
import { fetchMessages, sendMessage as sendMessageService } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';
import type { MessageData } from '@/types/conversation';

export const useConversationData = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const { profile } = useAuth();

  const loadMessages = useCallback(async (leadId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    
    try {
      const data = await fetchMessages(leadId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessagesError(error instanceof Error ? error.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (
    leadId: string, 
    message: string,
    complianceFunctions?: {
      checkSuppressed: (contact: string, type: "sms" | "email") => Promise<boolean>;
      enforceConsent: (leadId: string, channel: "sms" | "email") => Promise<boolean>;
      storeConsent: (params: any) => Promise<void>;
    }
  ) => {
    if (!profile) {
      throw new Error('User profile not available');
    }

    const result = await sendMessageService(leadId, message, profile, false, complianceFunctions);
    
    // Reload messages to show the new message
    await loadMessages(leadId);
    
    return result;
  }, [profile, loadMessages]);

  return {
    messages,
    messagesLoading,
    messagesError,
    loadMessages,
    sendMessage,
    setMessages
  };
};
