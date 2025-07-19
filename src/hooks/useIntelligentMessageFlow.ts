
import { useState, useEffect, useCallback } from 'react';
import { messageOrderingService, OrderedMessage } from '@/services/messageOrderingService';
import { realtimeMessageProcessor } from '@/services/realtimeMessageProcessor';

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
    
    // Trigger AI processing
    const success = await realtimeMessageProcessor.processNewCustomerMessage(leadId, messageBody);
    
    if (success) {
      // Reload messages to show the AI response
      setTimeout(() => {
        loadMessages();
      }, 2000); // Give time for AI response to be generated and saved
    }
  }, [leadId, loadMessages]);

  // Setup realtime listener
  useEffect(() => {
    console.log('🔗 [MESSAGE FLOW] Setting up realtime listener');
    const cleanup = realtimeMessageProcessor.setupRealtimeListener();
    return cleanup;
  }, []);

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
