
import { useState, useEffect, useCallback } from 'react';
import { messageOrderingService, OrderedMessage } from '@/services/messageOrderingService';

export const useIntelligentMessageFlow = (leadId: string | null) => {
  const [messages, setMessages] = useState<OrderedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsResponse, setNeedsResponse] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!leadId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 [MESSAGE FLOW] Loading messages for lead:', leadId);
      
      const orderedMessages = await messageOrderingService.getOrderedMessages(leadId);
      setMessages(orderedMessages);
      
      // Check if we need an AI response
      const needsAI = messageOrderingService.needsAIResponse(orderedMessages);
      setNeedsResponse(needsAI);
      
      // Mark messages as read
      await messageOrderingService.markMessagesAsRead(leadId);
      
      console.log('✅ [MESSAGE FLOW] Messages loaded:', {
        count: orderedMessages.length,
        needsAIResponse: needsAI,
        latestMessage: orderedMessages[orderedMessages.length - 1]?.body?.substring(0, 50) + '...'
      });
      
    } catch (error) {
      console.error('❌ [MESSAGE FLOW] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const processIncomingMessage = useCallback(async (messageBody: string) => {
    if (!leadId) return;
    
    console.log('📨 [MESSAGE FLOW] Processing incoming message:', messageBody.substring(0, 50) + '...');
    
    // Note: AI processing is now handled by edge function
    // Just reload messages after a short delay
    setTimeout(() => {
      loadMessages();
    }, 2000);
  }, [leadId, loadMessages]);

  // Load messages when leadId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    needsResponse,
    loadMessages,
    processIncomingMessage
  };
};
