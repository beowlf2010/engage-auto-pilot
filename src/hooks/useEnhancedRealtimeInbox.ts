
import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedRealtimeService } from '@/services/enhancedRealtimeService';
import { useOptimizedInbox } from './useOptimizedInbox';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface UseEnhancedRealtimeInboxProps {
  onLeadsRefresh?: () => void;
}

export const useEnhancedRealtimeInbox = ({ onLeadsRefresh }: UseEnhancedRealtimeInboxProps = {}) => {
  const [connectionState, setConnectionState] = useState(enhancedRealtimeService.getConnectionState());
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, MessageData[]>>(new Map());
  const currentLeadRef = useRef<string | null>(null);
  
  // Use the base optimized inbox
  const {
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalConversations,
    loadMessages,
    sendMessage: baseSendMessage,
    manualRefresh,
    setError
  } = useOptimizedInbox({ onLeadsRefresh });

  // Enhanced send message with optimistic updates
  const sendMessage = useCallback(async (leadId: string, messageContent: string) => {
    try {
      // Create optimistic message
      const optimisticMessage: MessageData = {
        id: `optimistic-${Date.now()}`,
        leadId,
        direction: 'out',
        body: messageContent.trim(),
        sentAt: new Date().toISOString(),
        aiGenerated: false,
        smsStatus: 'sending'
      };

      // Add optimistic message to state
      setOptimisticMessages(prev => {
        const updated = new Map(prev);
        const existing = updated.get(leadId) || [];
        updated.set(leadId, [...existing, optimisticMessage]);
        return updated;
      });

      // Send optimistic update via real-time service
      enhancedRealtimeService.optimisticallyAddMessage(leadId, optimisticMessage);

      console.log('⚡ [ENHANCED REALTIME INBOX] Sending message optimistically');

      // Send actual message
      await baseSendMessage(leadId, messageContent);

      // Update message status to sent
      enhancedRealtimeService.updateMessageStatus(leadId, optimisticMessage.id, 'sent');

      // Remove from optimistic messages after a delay to allow real message to load
      setTimeout(() => {
        setOptimisticMessages(prev => {
          const updated = new Map(prev);
          const existing = updated.get(leadId) || [];
          updated.set(leadId, existing.filter(msg => msg.id !== optimisticMessage.id));
          return updated;
        });
      }, 2000);

    } catch (error) {
      console.error('❌ [ENHANCED REALTIME INBOX] Send message failed:', error);
      
      // Update optimistic message to failed status
      setOptimisticMessages(prev => {
        const updated = new Map(prev);
        const existing = updated.get(leadId) || [];
        updated.set(leadId, existing.map(msg => 
          msg.id.startsWith('optimistic-') 
            ? { ...msg, smsStatus: 'failed', smsError: error instanceof Error ? error.message : 'Send failed' }
            : msg
        ));
        return updated;
      });

      throw error;
    }
  }, [baseSendMessage]);

  // Get combined messages (real + optimistic)
  const getCombinedMessages = useCallback((leadId: string): MessageData[] => {
    const realMessages = currentLeadRef.current === leadId ? messages : [];
    const optimistic = optimisticMessages.get(leadId) || [];
    
    // Combine and sort by timestamp
    const combined = [...realMessages, ...optimistic];
    return combined.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [messages, optimisticMessages]);

  // Enhanced load messages that sets current lead reference
  const loadMessagesEnhanced = useCallback(async (leadId: string) => {
    currentLeadRef.current = leadId;
    await loadMessages(leadId);
  }, [loadMessages]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((update: any) => {
    console.log('🔄 [ENHANCED REALTIME INBOX] Received update:', update.type);

    switch (update.type) {
      case 'conversation_update':
        if (update.data.connectionState) {
          setConnectionState(update.data.connectionState);
        }
        // Don't trigger full refresh for connection state changes
        if (!update.data.connectionState) {
          // Debounced refresh for other conversation updates
          setTimeout(manualRefresh, 100);
        }
        break;

      case 'message_update':
        if (update.leadId === currentLeadRef.current && !update.data.optimistic) {
          // Reload messages for current conversation
          loadMessages(update.leadId);
        }
        
        if (update.data.batchUpdate) {
          // Handle batched updates
          setTimeout(manualRefresh, 200);
        }
        break;

      case 'unread_update':
        // Quick refresh for unread counts
        setTimeout(manualRefresh, 50);
        break;
    }

    // Trigger leads refresh if needed
    if (onLeadsRefresh && (update.type === 'conversation_update' || update.type === 'unread_update')) {
      onLeadsRefresh();
    }
  }, [manualRefresh, loadMessages, onLeadsRefresh]);

  // Retry failed message
  const retryMessage = useCallback(async (leadId: string, failedMessageId: string) => {
    const optimistic = optimisticMessages.get(leadId) || [];
    const failedMessage = optimistic.find(msg => msg.id === failedMessageId);
    
    if (failedMessage) {
      // Remove failed message
      setOptimisticMessages(prev => {
        const updated = new Map(prev);
        const existing = updated.get(leadId) || [];
        updated.set(leadId, existing.filter(msg => msg.id !== failedMessageId));
        return updated;
      });

      // Retry sending
      await sendMessage(leadId, failedMessage.body);
    }
  }, [optimisticMessages, sendMessage]);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('🔗 [ENHANCED REALTIME INBOX] Setting up enhanced real-time subscription');
    
    const unsubscribe = enhancedRealtimeService.subscribe(handleRealtimeUpdate);

    return () => {
      console.log('🔌 [ENHANCED REALTIME INBOX] Cleaning up enhanced real-time subscription');
      unsubscribe();
    };
  }, [handleRealtimeUpdate]);

  // Update connection state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(enhancedRealtimeService.getConnectionState());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Base inbox functionality
    conversations,
    messages: currentLeadRef.current ? getCombinedMessages(currentLeadRef.current) : [],
    loading,
    error,
    sendingMessage,
    totalConversations,
    setError,
    
    // Enhanced functionality
    loadMessages: loadMessagesEnhanced,
    sendMessage,
    manualRefresh,
    
    // Real-time specific
    connectionState,
    optimisticMessages,
    retryMessage,
    reconnect: () => enhancedRealtimeService.reconnect(),
    
    // Utility functions
    getCombinedMessages,
    isConnected: connectionState.isConnected
  };
};
