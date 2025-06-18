
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
    console.log('🔄 fetchMessages called for lead:', leadId);
    currentLeadIdRef.current = leadId;
    await loadMessages(leadId);
  };

  // Enhanced real-time callbacks with better logging
  const handleConversationUpdate = () => {
    console.log('🔄 Real-time: Conversation update detected, refreshing conversations');
    loadConversations();
  };

  const handleMessageUpdate = (leadId: string) => {
    console.log('🔄 Real-time: Message update for lead:', leadId, 'Current lead:', currentLeadIdRef.current);
    
    // Always refresh conversations to update last message and unread counts
    loadConversations();
    
    // If this is for the currently selected lead, refresh messages immediately
    if (currentLeadIdRef.current === leadId) {
      console.log('🔄 Real-time: Refreshing messages for current lead');
      loadMessages(leadId);
    }
  };

  const handleUnreadCountUpdate = () => {
    console.log('🔄 Real-time: Unread count update, refreshing conversations');
    loadConversations();
  };

  // Use centralized realtime subscriptions with enhanced callbacks
  useCentralizedRealtime({
    onConversationUpdate: handleConversationUpdate,
    onMessageUpdate: handleMessageUpdate,
    onUnreadCountUpdate: handleUnreadCountUpdate
  });

  // Load initial conversations
  useEffect(() => {
    console.log('🔄 Initial load: Loading conversations');
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
