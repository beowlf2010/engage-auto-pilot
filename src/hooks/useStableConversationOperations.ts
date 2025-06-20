
import { useState, useCallback } from 'react';
import { useConversationsList } from './conversation/useConversationsList';
import { useMessagesOperations } from './conversation/useMessagesOperations';
import { useConversationRealtime } from './conversation/useConversationRealtime';

interface UseStableConversationOperationsProps {
  onLeadsRefresh?: () => void;
}

export const useStableConversationOperations = (props?: UseStableConversationOperationsProps) => {
  const [error, setError] = useState<string | null>(null);
  
  // Use the smaller focused hooks
  const { conversations, conversationsLoading, refetchConversations } = useConversationsList();
  const { selectedLeadId, messages, sendingMessage, loadMessages, sendMessage: originalSendMessage } = useMessagesOperations();
  
  // Set up realtime subscriptions with error handling
  useConversationRealtime(selectedLeadId, loadMessages);

  // Enhanced send message that triggers leads refresh
  const sendMessage = useCallback(async (leadId: string, messageBody: string, retryCount: number = 0) => {
    try {
      await originalSendMessage(leadId, messageBody, retryCount);
      
      // Trigger leads refresh after successful message send
      if (props?.onLeadsRefresh) {
        console.log('🔄 [STABLE CONV] Triggering leads refresh after message send');
        setTimeout(() => {
          props.onLeadsRefresh?.();
        }, 500); // Small delay to ensure database updates are complete
      }
    } catch (error) {
      console.error('❌ [STABLE CONV] Enhanced send message error:', error);
      throw error;
    }
  }, [originalSendMessage, props?.onLeadsRefresh]);

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
      
      // Also trigger leads refresh if available
      if (props?.onLeadsRefresh) {
        console.log('🔄 [STABLE CONV] Triggering leads refresh during manual refresh');
        props.onLeadsRefresh();
      }
      
    } catch (err) {
      console.error('❌ [STABLE CONV] Error during manual refresh:', err);
      // Don't set error for realtime connection issues, only for data loading issues
      if (err instanceof Error && !err.message.includes('realtime') && !err.message.includes('timeout')) {
        setError('Failed to refresh data. Please try again.');
      }
    }
  }, [refetchConversations, selectedLeadId, loadMessages, props?.onLeadsRefresh]);

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
