
import { useRef, useEffect, useCallback } from 'react';
import { useConversationOperations } from './useConversationOperations';
import { useCentralizedRealtime } from './useCentralizedRealtime';

export const useRealtimeInbox = () => {
  const currentLeadIdRef = useRef<string | null>(null);
  const lastRefreshRef = useRef<number>(0);
  
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

  // Enhanced message fetching with immediate UI updates
  const fetchMessages = async (leadId: string) => {
    console.log('🔄 Enhanced fetchMessages called for lead:', leadId);
    currentLeadIdRef.current = leadId;
    
    try {
      await loadMessages(leadId);
      console.log('✅ Messages loaded successfully');
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      throw error;
    }
  };

  // Enhanced real-time callbacks with debouncing and immediate refresh
  const handleConversationUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) {
      console.log('⏱️ Debouncing conversation update');
      return;
    }
    lastRefreshRef.current = now;
    
    console.log('🔄 Enhanced real-time: Conversation update detected, refreshing immediately');
    loadConversations();
  }, [loadConversations]);

  const handleMessageUpdate = useCallback((leadId: string) => {
    console.log('🔄 Enhanced real-time: Message update for lead:', leadId, 'Current lead:', currentLeadIdRef.current);
    
    // Always refresh conversations immediately for unread counts and last messages
    loadConversations();
    
    // If this is for the currently selected lead, refresh messages immediately
    if (currentLeadIdRef.current === leadId) {
      console.log('🔄 Enhanced real-time: Refreshing messages for current lead immediately');
      loadMessages(leadId);
    }
  }, [loadConversations, loadMessages]);

  const handleUnreadCountUpdate = useCallback(() => {
    console.log('🔄 Enhanced real-time: Unread count update, refreshing conversations immediately');
    loadConversations();
  }, [loadConversations]);

  // Use enhanced centralized realtime subscriptions
  const { forceRefresh, isConnected, reconnect } = useCentralizedRealtime({
    onConversationUpdate: handleConversationUpdate,
    onMessageUpdate: handleMessageUpdate,
    onUnreadCountUpdate: handleUnreadCountUpdate
  });

  // Load initial conversations with retry logic
  useEffect(() => {
    console.log('🔄 Enhanced initial load: Loading conversations');
    
    const loadWithRetry = async (retries = 3) => {
      try {
        await loadConversations();
      } catch (error) {
        console.error('❌ Error loading conversations:', error);
        if (retries > 0) {
          console.log(`🔄 Retrying conversations load (${retries} attempts left)`);
          setTimeout(() => loadWithRetry(retries - 1), 1000);
        }
      }
    };
    
    loadWithRetry();
  }, [loadConversations]);

  // Enhanced send message function with immediate UI updates and error handling
  const enhancedSendMessage = async (leadId: string, message: string) => {
    try {
      console.log('📤 Enhanced sending message with immediate refresh preparation');
      
      // Send the message
      await sendMessage(leadId, message);
      
      // Multiple immediate refresh triggers for instant UI updates
      console.log('🔄 Triggering enhanced immediate refresh after message sent');
      
      // Immediate refresh without delay
      loadConversations();
      if (currentLeadIdRef.current === leadId) {
        loadMessages(leadId);
      }
      
      // Additional refresh after short delay to ensure consistency
      setTimeout(() => {
        console.log('🔄 Secondary refresh for consistency');
        loadConversations();
        if (currentLeadIdRef.current === leadId) {
          loadMessages(leadId);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error in enhanced send message:', error);
      throw error;
    }
  };

  // Enhanced manual refresh with connection check
  const enhancedRefresh = useCallback(() => {
    console.log('🔄 Enhanced manual refresh triggered');
    
    if (!isConnected) {
      console.log('🔌 Reconnecting realtime before refresh');
      reconnect();
    }
    
    manualRefresh();
    forceRefresh();
  }, [manualRefresh, forceRefresh, isConnected, reconnect]);

  return {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage: enhancedSendMessage,
    refetch: enhancedRefresh,
    isRealtimeConnected: isConnected,
    forceRefresh: enhancedRefresh
  };
};
