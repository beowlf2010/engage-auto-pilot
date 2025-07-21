
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
    stableRealtimeManager.getConnectionStatus()
  );

  const fetchMessages = useCallback(async (leadId: string) => {
    console.log('🔄 [STABLE INBOX] Fetching messages for lead:', leadId);
    currentLeadIdRef.current = leadId;
    
    try {
      await loadMessages(leadId);
      console.log('✅ [STABLE INBOX] Messages loaded successfully');
      
      // Enhanced: Immediate visual feedback and global unread count update
      console.log('📖 [STABLE INBOX] Triggering immediate unread count refresh');
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
      
    } catch (error) {
      console.error('❌ [STABLE INBOX] Error loading messages:', error);
      throw error;
    }
  }, [loadMessages]);

  const handleConversationUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) { // Reduced debounce to 1 second
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
    }, 500); // Reduced delay to 500ms
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
            
            // Enhanced: Immediate unread count refresh for any conversation changes
            console.log('🔄 [STABLE INBOX] Triggering global unread count refresh from realtime');
            window.dispatchEvent(new CustomEvent('unread-count-changed'));
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
    const removeListener = stableRealtimeManager.addConnectionListener((connected) => {
      setConnectionState(stableRealtimeManager.getConnectionStatus());
    });
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
      
      // Enhanced: Immediate refresh for instant UI updates
      const refreshPromises = [
        loadConversations(),
        currentLeadIdRef.current === leadId ? loadMessages(leadId) : Promise.resolve()
      ];
      
      await Promise.all(refreshPromises);
      
      // Enhanced: Immediate global unread count update
      console.log('🔄 [STABLE INBOX] Triggering global unread count refresh after send');
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
      
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
    
    // Enhanced: Also refresh global unread count
    console.log('🔄 [STABLE INBOX] Triggering global unread count refresh from manual refresh');
    window.dispatchEvent(new CustomEvent('unread-count-changed'));
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
