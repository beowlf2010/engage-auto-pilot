
import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedConversationService } from '@/services/enhancedConversationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface UseEnhancedPredictiveInboxProps {
  onLeadsRefresh?: () => void;
  enablePredictiveLoading?: boolean;
}

export const useEnhancedPredictiveInbox = ({ 
  onLeadsRefresh, 
  enablePredictiveLoading = true 
}: UseEnhancedPredictiveInboxProps = {}) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [totalConversations, setTotalConversations] = useState(0);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationListItem[]>([]);

  const queryClient = useQueryClient();
  const loadingRef = useRef(false);
  const currentLeadRef = useRef<string | null>(null);

  // Configure predictive service
  useEffect(() => {
    enhancedConversationService.setBackgroundLoading(enablePredictiveLoading);
  }, [enablePredictiveLoading]);

  // Load conversations with predictive features
  const loadConversations = useCallback(async (filters = {}) => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 [ENHANCED PREDICTIVE] Loading conversations with filters:', filters);
      
      const result = await enhancedConversationService.getConversationsWithPrediction(0, 50, filters);
      
      setConversations(result.conversations);
      setTotalConversations(result.totalCount);
      setPredictions(result.predictions || []);
      
      console.log('📊 [ENHANCED PREDICTIVE] Loaded:', {
        conversations: result.conversations.length,
        total: result.totalCount,
        predictions: result.predictions?.length || 0
      });

      if (onLeadsRefresh) {
        onLeadsRefresh();
      }

    } catch (error) {
      console.error('❌ [ENHANCED PREDICTIVE] Error loading conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [onLeadsRefresh]);

  // Load messages with predictive caching
  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId || currentLeadRef.current === leadId) return;
    
    setMessagesLoading(true);
    setError(null);
    currentLeadRef.current = leadId;

    try {
      console.log('📱 [ENHANCED PREDICTIVE] Loading messages for lead:', leadId);
      
      const loadedMessages = await enhancedConversationService.getMessagesWithPrediction(leadId);
      
      setMessages(loadedMessages);
      
      console.log(`📦 [ENHANCED PREDICTIVE] Loaded ${loadedMessages.length} messages for lead:`, leadId);

    } catch (error) {
      console.error('❌ [ENHANCED PREDICTIVE] Error loading messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Enhanced search with fast results
  const searchConversations = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 [ENHANCED PREDICTIVE] Searching for:', query);
    
    const results = enhancedConversationService.searchConversations(query, 20);
    setSearchResults(results);
    
    console.log(`🎯 [ENHANCED PREDICTIVE] Found ${results.length} search results`);
  }, []);

  // Send message with enhanced caching
  const sendMessage = useCallback(async (leadId: string, messageContent: string) => {
    if (!leadId || !messageContent.trim() || sendingMessage) return;

    setSendingMessage(true);
    setError(null);

    try {
      console.log('📤 [ENHANCED PREDICTIVE] Sending message to lead:', leadId);

      // Get phone number
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();

      if (phoneError || !phoneData) {
        throw new Error('No primary phone number found for this lead');
      }

      // Create conversation record
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          body: messageContent.trim(),
          direction: 'out',
          ai_generated: false,
          sent_at: new Date().toISOString(),
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) throw conversationError;

      // Send SMS
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageContent.trim(),
          conversationId: conversation.id
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to send message');
      }

      // Update conversation status
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: data?.telnyxMessageId
        })
        .eq('id', conversation.id);

      // Invalidate cache and refresh
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Reload messages for current conversation
      if (currentLeadRef.current === leadId) {
        await loadMessages(leadId);
      }

      // Refresh conversations list
      await loadConversations();

      console.log('✅ [ENHANCED PREDICTIVE] Message sent successfully');

    } catch (error) {
      console.error('❌ [ENHANCED PREDICTIVE] Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [sendingMessage, queryClient, loadMessages, loadConversations]);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    console.log('🔄 [ENHANCED PREDICTIVE] Manual refresh triggered');
    await loadConversations();
  }, [loadConversations]);

  // Get prediction insights for debugging
  const getPredictionInsights = useCallback(() => {
    return enhancedConversationService.getPredictionInsights();
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    // Core data
    conversations,
    messages,
    selectedLead,
    loading,
    messagesLoading,
    error,
    sendingMessage,
    totalConversations,
    
    // Enhanced features
    predictions,
    searchQuery,
    searchResults,
    
    // Actions
    setSelectedLead,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    searchConversations,
    setError,
    
    // Insights
    getPredictionInsights
  };
};
