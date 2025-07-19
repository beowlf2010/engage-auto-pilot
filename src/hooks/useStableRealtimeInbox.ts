
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useConversationOperations } from './useConversationOperations';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';

export const useStableRealtimeInbox = () => {
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

  // Memoized connection state
  const [connectionState, setConnectionState] = useState(() => 
    stableRealtimeManager.getConnectionState()
  );

  // Stable message fetching function
  const fetchMessages = useCallback(async (leadId: string) => {
    console.log('🔄 [STABLE INBOX] Fetching messages for lead:', leadId);
    currentLeadIdRef.current = leadId;
    
    try {
      await loadMessages(leadId);
      console.log('✅ [STABLE INBOX] Messages loaded successfully');
    } catch (error) {
      console.error('❌ [STABLE INBOX] Error loading messages:', error);
      throw error;
    }
  }, [loadMessages]);

  // Debounced update handlers
  const handleConversationUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) { // Increased debounce to 1s
      console.log('⏱️ [STABLE INBOX] Debouncing conversation update');
      return;
    }
    lastRefreshRef.current = now;
    
    console.log('🔄 [STABLE INBOX] Conversation update - refreshing');
    loadConversations();
  }, [loadConversations]);

  const handleMessageUpdate = useCallback((leadId: string) => {
    console.log('🔄 [STABLE INBOX] Message update for lead:', leadId);
    
    // Clear any pending refresh
    if (pendingRefreshRef.current) {
      clearTimeout(pendingRefreshRef.current);
    }
    
    // Debounced refresh to prevent rapid updates
    pendingRefreshRef.current = setTimeout(() => {
      loadConversations();
      
      // Only refresh messages for current lead
      if (currentLeadIdRef.current === leadId) {
        console.log('🔄 [STABLE INBOX] Refreshing messages for current lead');
        loadMessages(leadId);
      }
    }, 500);
  }, [loadConversations, loadMessages]);

  // Stable realtime subscription
  useEffect(() => {
    console.log('🔗 [STABLE INBOX] Setting up realtime subscription');
    
    const unsubscribe = stableRealtimeManager.subscribe({
      id: 'stable-conversations-updates',
      callback: (payload) => {
        console.log('🔄 [STABLE INBOX] Received update:', payload.eventType);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (payload.table === 'conversations') {
            handleConversationUpdate();
            
            if (payload.new?.lead_id) {
              handleMessageUpdate(payload.new.lead_id);
            }
          }
        }
      },
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    return () => {
      console.log('🔌 [STABLE INBOX] Cleaning up realtime subscription');
      unsubscribe();
    };
  }, [handleConversationUpdate, handleMessageUpdate]);

  // Connection state listener
  useEffect(() => {
    const removeListener = stableRealtimeManager.addConnectionListener(setConnectionState);
    return removeListener;
  }, []);

  // Load initial conversations
  useEffect(() => {
    console.log('🔄 [STABLE INBOX] Loading initial conversations');
    loadConversations();
  }, [loadConversations]);

  // Enhanced send message with optimistic updates
  const enhancedSendMessage = useCallback(async (leadId: string, message: string) => {
    try {
      console.log('📤 [STABLE INBOX] Sending message');
      
      await sendMessage(leadId, message);
      
      // Immediate refresh for better UX
      const refreshPromises = [
        loadConversations(),
        currentLeadIdRef.current === leadId ? loadMessages(leadId) : Promise.resolve()
      ];
      
      await Promise.all(refreshPromises);
      
    } catch (error) {
      console.error('❌ [STABLE INBOX] Send message failed:', error);
      throw error;
    }
  }, [sendMessage, loadConversations, loadMessages]);

  // Enhanced manual refresh
  const enhancedRefresh = useCallback(() => {
    console.log('🔄 [STABLE INBOX] Manual refresh triggered');
    
    if (!connectionState.isConnected) {
      console.log('🔌 [STABLE INBOX] Reconnecting before refresh');
      stableRealtimeManager.forceReconnect();
    }
    
    manualRefresh();
  }, [manualRefresh, connectionState.isConnected]);

  // Cleanup pending timeouts
  useEffect(() => {
    return () => {
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
    };
  }, []);

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(() => ({
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage: enhancedSendMessage,
    refetch: enhancedRefresh,
    isRealtimeConnected: connectionState.isConnected,
    connectionState,
    forceRefresh: enhancedRefresh,
    forceReconnect: () => stableRealtimeManager.forceReconnect(),
    getHealthStatus: () => stableRealtimeManager.getHealthStatus()
  }), [
    conversations,
    messages,
    loading,
    error,
    fetchMessages,
    enhancedSendMessage,
    enhancedRefresh,
    connectionState
  ]);
};
