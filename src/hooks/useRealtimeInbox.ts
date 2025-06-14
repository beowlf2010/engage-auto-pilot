
import { useRef, useEffect } from 'react';
import { useInboxNotifications } from './useInboxNotifications';
import { useConversationOperations } from './useConversationOperations';
import { useRealtimeSubscriptions } from './useRealtimeSubscriptions';

export const useRealtimeInbox = () => {
  const currentLeadIdRef = useRef<string | null>(null);
  
  // Use the inbox notifications hook
  useInboxNotifications();
  
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

  // Use realtime subscriptions hook
  useRealtimeSubscriptions({
    onConversationUpdate: loadConversations,
    onMessageUpdate: loadMessages,
    currentLeadId: currentLeadIdRef.current
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
