
import { useEffect } from 'react';
import { useConversationOperations } from './useConversationOperations';
import { useRealtimeChannels } from './useRealtimeChannels';

export const useConversations = () => {
  const {
    conversations,
    messages,
    loading,
    loadConversations,
    loadMessages,
    sendMessage
  } = useConversationOperations();

  const {
    setupConversationChannel,
    setupMessageChannel,
    setCurrentLeadId,
    cleanupAllChannels
  } = useRealtimeChannels();

  const fetchMessages = async (leadId: string) => {
    await loadMessages(leadId);
    setCurrentLeadId();
    
    // Set up message channel for this specific lead (disabled)
    setupMessageChannel();
  };

  // Setup conversation channel when available
  useEffect(() => {
    setupConversationChannel();
    loadConversations();

    return () => {
      cleanupAllChannels();
    };
  }, [setupConversationChannel, loadConversations, cleanupAllChannels]);

  return { 
    conversations, 
    messages, 
    loading, 
    fetchMessages, 
    sendMessage,
    refetch: loadConversations 
  };
};
