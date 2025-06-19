
import { useState, useCallback } from 'react';
import { useConversationsList } from './conversation/useConversationsList';
import { useMessagesOperations } from './conversation/useMessagesOperations';
import { useConversationRealtime } from './conversation/useConversationRealtime';

export const useStableConversationOperations = () => {
  const [error, setError] = useState<string | null>(null);
  
  // Use the smaller focused hooks
  const { conversations, conversationsLoading, refetchConversations } = useConversationsList();
  const { selectedLeadId, messages, sendingMessage, loadMessages, sendMessage } = useMessagesOperations();
  
  // Set up realtime subscriptions
  useConversationRealtime(selectedLeadId, loadMessages);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    try {
      setError(null);
      await refetchConversations();
      if (selectedLeadId) {
        await loadMessages(selectedLeadId);
      }
    } catch (err) {
      console.error('❌ [STABLE CONV] Error during manual refresh:', err);
      setError('Failed to refresh data');
    }
  }, [refetchConversations, selectedLeadId, loadMessages]);

  return {
    conversations,
    messages,
    loading: conversationsLoading,
    error,
    selectedLeadId,
    sendingMessage,
    loadMessages,
    sendMessage,
    manualRefresh,
    setError
  };
};
