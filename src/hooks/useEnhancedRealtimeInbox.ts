
import { useState, useCallback, useRef } from 'react';
import { useOptimizedInbox } from './useOptimizedInbox';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface UseEnhancedRealtimeInboxProps {
  onLeadsRefresh?: () => void;
}

// DISABLED: This hook is now disabled to prevent subscription conflicts
// Kept for backward compatibility but no longer creates realtime subscriptions
export const useEnhancedRealtimeInbox = ({ onLeadsRefresh }: UseEnhancedRealtimeInboxProps = {}) => {
  const isDisabledRef = useRef(true);
  const [optimisticMessages] = useState<Map<string, MessageData[]>>(new Map());
  
  // Use the base optimized inbox without realtime
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

  // Disabled connection state
  const connectionState = {
    isConnected: false,
    status: 'offline' as const,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  };

  console.log('🚫 [ENHANCED REALTIME INBOX] This hook is disabled - use useStableRealtimeInbox instead');

  const retryMessage = useCallback(async (leadId: string, failedMessageId: string) => {
    console.log('🚫 [ENHANCED REALTIME INBOX] Retry function disabled');
  }, []);

  const getCombinedMessages = useCallback((leadId: string): MessageData[] => {
    return messages; // Just return regular messages
  }, [messages]);

  return {
    // Base inbox functionality
    conversations,
    messages,
    loading,
    error,
    sendingMessage,
    totalConversations,
    setError,
    
    // Enhanced functionality (disabled)
    loadMessages,
    sendMessage: baseSendMessage,
    manualRefresh,
    
    // Real-time specific (disabled)
    connectionState,
    optimisticMessages,
    retryMessage,
    reconnect: () => console.log('🚫 Reconnect disabled'),
    
    // Utility functions
    getCombinedMessages,
    isConnected: false
  };
};
