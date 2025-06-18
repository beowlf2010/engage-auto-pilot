
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

  // Enhanced real-time callbacks with immediate UI refresh
  const handleConversationUpdate = () => {
    console.log('🔄 Real-time: Conversation update detected, refreshing conversations immediately');
    loadConversations();
  };

  const handleMessageUpdate = (leadId: string) => {
    console.log('🔄 Real-time: Message update for lead:', leadId, 'Current lead:', currentLeadIdRef.current);
    
    // Always refresh conversations immediately to update last message and unread counts
    loadConversations();
    
    // If this is for the currently selected lead, refresh messages immediately
    if (currentLeadIdRef.current === leadId) {
      console.log('🔄 Real-time: Refreshing messages for current lead immediately');
      loadMessages(leadId);
    }
  };

  const handleUnreadCountUpdate = () => {
    console.log('🔄 Real-time: Unread count update, refreshing conversations immediately');
    loadConversations();
  };

  // Use centralized realtime subscriptions with enhanced callbacks for immediate refresh
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

  // Enhanced send message function that triggers immediate refresh
  const enhancedSendMessage = async (leadId: string, message: string) => {
    try {
      console.log('📤 Sending message and preparing immediate refresh');
      
      // Send the message
      await sendMessage(leadId, message);
      
      // Immediately refresh conversations and current messages for instant UI update
      console.log('🔄 Triggering immediate refresh after message sent');
      
      // Small delay to ensure message is saved before refreshing
      setTimeout(() => {
        loadConversations();
        if (currentLeadIdRef.current === leadId) {
          loadMessages(leadId);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error in enhanced send message:', error);
      throw error;
    }
  };

  return {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage: enhancedSendMessage, // Use enhanced version for immediate refresh
    refetch: manualRefresh
  };
};
