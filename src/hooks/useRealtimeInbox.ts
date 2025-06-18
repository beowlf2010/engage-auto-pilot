
import { useRef, useEffect } from 'react';
import { useConversationOperations } from './useConversationOperations';
import { useCentralizedRealtime } from './useCentralizedRealtime';

export const useRealtimeInbox = () => {
  const currentLeadIdRef = useRef<string | null>(null);
  
  // Use conversation operations hook
  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh
  } = useConversationOperations();

  // Update current lead ref when loading messages
  const fetchMessages = async (leadId: string) => {
    currentLeadIdRef.current = leadId;
    await loadMessages(leadId);
  };

  // Use centralized realtime subscriptions
  useCentralizedRealtime({
    onConversationUpdate: loadConversations,
    onMessageUpdate: (leadId: string) => {
      if (currentLeadIdRef.current === leadId) {
        loadMessages(leadId);
      }
    },
    onUnreadCountUpdate: loadConversations
  });

  // Load initial conversations
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    refetch: manualRefresh
  };
};
