
import { useRef, useEffect, useCallback } from 'react';
import { useConversationOperations } from './useConversationOperations';
import { useResilientRealtime } from './useResilientRealtime';

export const useRealtimeInbox = () => {
  const currentLeadIdRef = useRef<string | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const pendingRefreshRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Enhanced real-time callbacks with immediate refresh and debouncing
  const handleConversationUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 500) {
      console.log('⏱️ Debouncing conversation update');
      return;
    }
    lastRefreshRef.current = now;
    
    console.log('🔄 Enhanced real-time: Conversation update detected, refreshing immediately');
    loadConversations();
  }, [loadConversations]);

  const handleMessageUpdate = useCallback((leadId: string) => {
    console.log('🔄 Enhanced real-time: Message update for lead:', leadId, 'Current lead:', currentLeadIdRef.current);
    
    // Clear any pending refresh
    if (pendingRefreshRef.current) {
      clearTimeout(pendingRefreshRef.current);
    }
    
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

  // Use enhanced resilient realtime subscriptions
  const { connectionState, isConnected, forceReconnect, getHealthStatus } = useResilientRealtime({
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

  // Enhanced send message function with immediate UI updates and optimistic updates
  const enhancedSendMessage = async (leadId: string, message: string) => {
    try {
      console.log('📤 Enhanced sending message with immediate refresh preparation');
      
      // Send the message
      await sendMessage(leadId, message);
      
      // Immediate refresh triggers for instant UI updates
      console.log('🔄 Triggering enhanced immediate refresh after message sent');
      
      // Immediate refresh without delay for instant feedback
      const refreshPromises = [
        loadConversations(),
        currentLeadIdRef.current === leadId ? loadMessages(leadId) : Promise.resolve()
      ];
      
      await Promise.all(refreshPromises);
      
      // Additional safety refresh after a short delay to ensure consistency
      pendingRefreshRef.current = setTimeout(async () => {
        console.log('🔄 Secondary refresh for consistency');
        await loadConversations();
        if (currentLeadIdRef.current === leadId) {
          await loadMessages(leadId);
        }
      }, 200);
      
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
      forceReconnect();
    }
    
    manualRefresh();
  }, [manualRefresh, isConnected, forceReconnect]);

  // Cleanup pending timeouts
  useEffect(() => {
    return () => {
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
    };
  }, []);

  return {
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage: enhancedSendMessage,
    refetch: enhancedRefresh,
    isRealtimeConnected: isConnected,
    connectionState,
    forceRefresh: enhancedRefresh,
    forceReconnect,
    getHealthStatus
  };
};
