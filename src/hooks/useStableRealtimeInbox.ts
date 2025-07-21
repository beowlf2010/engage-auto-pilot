
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useConversationOperations } from './useConversationOperations';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';

export const useStableRealtimeInbox = () => {
  const currentLeadIdRef = useRef<string | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const pendingRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionIdRef = useRef<string>(`inbox-${Date.now()}-${Math.random()}`);
  const isSubscribedRef = useRef<boolean>(false);
  
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

  const [connectionState, setConnectionState] = useState(() => 
    stableRealtimeManager.getConnectionState()
  );

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

  const handleConversationUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) { // Increased debounce to 2 seconds
      console.log('⏱️ [STABLE INBOX] Debouncing conversation update');
      return;
    }
    lastRefreshRef.current = now;
    
    console.log('🔄 [STABLE INBOX] Conversation update - refreshing immediately');
    loadConversations();
  }, [loadConversations]);

  const handleMessageUpdate = useCallback((leadId: string) => {
    console.log('🔄 [STABLE INBOX] Message update for lead:', leadId);
    
    if (pendingRefreshRef.current) {
      clearTimeout(pendingRefreshRef.current);
    }
    
    pendingRefreshRef.current = setTimeout(() => {
      console.log('🔄 [STABLE INBOX] Executing delayed refresh after message update');
      loadConversations();
      
      if (currentLeadIdRef.current === leadId) {
        console.log('🔄 [STABLE INBOX] Refreshing messages for current lead');
        loadMessages(leadId);
      }
    }, 1000); // Increased delay to 1 second
  }, [loadConversations, loadMessages]);

  const setupRealtimeSubscription = useCallback(() => {
    if (isSubscribedRef.current) {
      console.log('⚠️ [STABLE INBOX] Already subscribed, skipping');
      return () => {};
    }

    console.log('🔗 [STABLE INBOX] Setting up realtime subscription');
    isSubscribedRef.current = true;
    
    const unsubscribe = stableRealtimeManager.subscribe({
      id: subscriptionIdRef.current,
      callback: (payload) => {
        console.log('🔄 [STABLE INBOX] Received realtime update:', payload.eventType);

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
      isSubscribedRef.current = false;
      unsubscribe();
    };
  }, [handleConversationUpdate, handleMessageUpdate]);

  useEffect(() => {
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription]);

  useEffect(() => {
    const removeListener = stableRealtimeManager.addConnectionListener(setConnectionState);
    return removeListener;
  }, []);

  useEffect(() => {
    console.log('🔄 [STABLE INBOX] Loading initial conversations with enhanced logging');
    loadConversations();
  }, [loadConversations]);

  const enhancedSendMessage = useCallback(async (leadId: string, message: string) => {
    try {
      console.log('📤 [STABLE INBOX] Sending message with immediate refresh');
      
      await sendMessage(leadId, message);
      
      // Immediate refresh for instant UI updates
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

  const enhancedRefresh = useCallback(() => {
    console.log('🔄 [STABLE INBOX] Manual refresh triggered with connection check');
    
    if (!connectionState.isConnected) {
      console.log('🔌 [STABLE INBOX] Reconnecting before refresh');
      stableRealtimeManager.forceReconnect();
    }
    
    manualRefresh();
  }, [manualRefresh, connectionState.isConnected]);

  useEffect(() => {
    return () => {
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
    };
  }, []);

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
