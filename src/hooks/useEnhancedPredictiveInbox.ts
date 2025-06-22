import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedConversationService } from '@/services/enhancedConversationService';
import { userActivityMonitor } from '@/services/userActivityMonitor';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConversationListItem, MessageData } from '@/types/conversation';

interface UseEnhancedPredictiveInboxProps {
  onLeadsRefresh?: () => void;
  enablePredictiveLoading?: boolean;
  enableAdvancedTracking?: boolean;
}

export const useEnhancedPredictiveInbox = ({ 
  onLeadsRefresh, 
  enablePredictiveLoading = true,
  enableAdvancedTracking = true
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
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  const queryClient = useQueryClient();
  const loadingRef = useRef(false);
  const currentLeadRef = useRef<string | null>(null);
  const accessSequence = useRef<string[]>([]);

  // Setup advanced activity tracking
  useEffect(() => {
    if (!enableAdvancedTracking) return;

    console.log('🎯 [ENHANCED PREDICTIVE] Setting up advanced activity tracking');

    const cleanup = userActivityMonitor.onActivity((activity) => {
      console.log('📱 [ENHANCED PREDICTIVE] User activity detected:', activity.type);
      
      // Track different types of activities for better predictions
      switch (activity.type) {
        case 'conversation_hover':
          if (activity.leadId) {
            enhancedConversationService.scheduleUrgentLoading(activity.leadId, 'hover preload');
          }
          break;
        case 'conversation_selection':
          if (activity.leadId && currentLeadRef.current !== activity.leadId) {
            accessSequence.current.push(activity.leadId);
            if (accessSequence.current.length > 10) {
              accessSequence.current.shift();
            }
          }
          break;
        case 'search_query':
          if (activity.query) {
            setSearchQuery(activity.query);
            searchConversations(activity.query);
          }
          break;
      }
    });

    return cleanup;
  }, [enableAdvancedTracking]);

  // Monitor performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = enhancedConversationService.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Load conversations with advanced predictions
  const loadConversations = useCallback(async (filters = {}) => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 [ENHANCED PREDICTIVE] Loading conversations with ML predictions');
      
      const result = await enhancedConversationService.getConversationsWithPrediction(0, 50, filters);
      
      setConversations(result.conversations);
      setTotalConversations(result.totalCount);
      setPredictions(result.predictions || []);
      
      console.log('📊 [ENHANCED PREDICTIVE] Loaded with ML insights:', {
        conversations: result.conversations.length,
        total: result.totalCount,
        predictions: result.predictions?.length || 0,
        highConfidencePredictions: result.predictions?.filter(p => p.confidenceLevel > 0.7).length || 0
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

  // Load messages with advanced context tracking
  const loadMessages = useCallback(async (leadId: string) => {
    if (!leadId || currentLeadRef.current === leadId) return;
    
    setMessagesLoading(true);
    setError(null);
    
    const previousLead = currentLeadRef.current;
    currentLeadRef.current = leadId;

    try {
      console.log('📱 [ENHANCED PREDICTIVE] Loading messages with context tracking for:', leadId);
      
      const context = {
        fromLeadId: previousLead,
        searchQuery: searchQuery || undefined,
        accessSequence: [...accessSequence.current],
        timestamp: new Date()
      };

      const loadedMessages = await enhancedConversationService.getMessagesWithPrediction(leadId, context);
      
      setMessages(loadedMessages);
      
      console.log(`📦 [ENHANCED PREDICTIVE] Loaded ${loadedMessages.length} messages with context tracking`);

    } catch (error) {
      console.error('❌ [ENHANCED PREDICTIVE] Error loading messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, [searchQuery]);

  // Enhanced search with ML-powered relevance
  const searchConversations = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 [ENHANCED PREDICTIVE] ML-powered search for:', query);
    
    // Fix: Pass proper filters object instead of just a number
    const results = enhancedConversationService.searchConversations(query, {}, 20);
    setSearchResults(results);
    
    console.log(`🎯 [ENHANCED PREDICTIVE] Found ${results.length} ML-enhanced results`);
  }, []);

  // Send message with enhanced tracking
  const sendMessage = useCallback(async (leadId: string, messageContent: string) => {
    if (!leadId || !messageContent.trim() || sendingMessage) return;

    setSendingMessage(true);
    setError(null);

    try {
      console.log('📤 [ENHANCED PREDICTIVE] Sending message with context tracking');

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

      console.log('✅ [ENHANCED PREDICTIVE] Message sent with enhanced tracking');

    } catch (error) {
      console.error('❌ [ENHANCED PREDICTIVE] Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }, [sendingMessage, queryClient, loadMessages, loadConversations]);

  // Manual refresh with enhanced metrics
  const manualRefresh = useCallback(async () => {
    console.log('🔄 [ENHANCED PREDICTIVE] Manual refresh with performance tracking');
    const startTime = Date.now();
    
    await loadConversations();
    
    const refreshTime = Date.now() - startTime;
    console.log(`⚡ [ENHANCED PREDICTIVE] Refresh completed in ${refreshTime}ms`);
  }, [loadConversations]);

  // Get comprehensive prediction insights
  const getPredictionInsights = useCallback(() => {
    const insights = enhancedConversationService.getPredictionInsights();
    
    return {
      ...insights,
      performanceMetrics,
      userActivity: userActivityMonitor.getCurrentSession(),
      activityPatterns: userActivityMonitor.getActivityPatterns()
    };
  }, [performanceMetrics]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      enhancedConversationService.stop();
    };
  }, []);

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
    performanceMetrics,
    
    // Actions
    setSelectedLead,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    searchConversations,
    setError,
    
    // Enhanced insights
    getPredictionInsights,
    
    // Activity monitoring
    getUserActivity: () => userActivityMonitor.getCurrentSession(),
    getActivityPatterns: () => userActivityMonitor.getActivityPatterns()
  };
};
