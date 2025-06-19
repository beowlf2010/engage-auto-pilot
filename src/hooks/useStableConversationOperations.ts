
import { useState, useCallback } from 'react';
import { useConversationsList } from './conversation/useConversationsList';
import { useMessagesOperations } from './conversation/useMessagesOperations';
import { useConversationRealtime } from './conversation/useConversationRealtime';

export const useStableConversationOperations = () => {
  const [error, setError] = useState<string | null>(null);
  
  // Use the smaller focused hooks
  const { conversations, conversationsLoading, refetchConversations } = useConversationsList();
  const { selectedLeadId, messages, sendingMessage, loadMessages, sendMessage } = useMessagesOperations();
  
  // Set up realtime subscriptions with error handling
  useConversationRealtime(selectedLeadId, loadMessages);

  // Manual refresh function with better error handling
  const manualRefresh = useCallback(async () => {
    try {
      console.log('🔄 [STABLE CONV] Manual refresh started');
      setError(null);
      
      // Refresh conversations
      await refetchConversations();
      console.log('✅ [STABLE CONV] Conversations refreshed');
      
      // Refresh messages if a lead is selected
      if (selectedLeadId) {
        await loadMessages(selectedLeadId);
        console.log('✅ [STABLE CONV] Messages refreshed for lead:', selectedLeadId);
      }
      
    } catch (err) {
      console.error('❌ [STABLE CONV] Error during manual refresh:', err);
      // Don't set error for realtime connection issues, only for data loading issues
      if (err instanceof Error && !err.message.includes('realtime') && !err.message.includes('timeout')) {
        setError('Failed to refresh data. Please try again.');
      }
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
