
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
    setCurrentLeadId(leadId);
    
    // Set up message channel for this specific lead
    setupMessageChannel(leadId, loadMessages);
  };

  // Setup conversation channel when available
  useEffect(() => {
    setupConversationChannel('', loadConversations);
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
