import { supabase } from '@/integrations/supabase/client';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { fixedBackgroundLoadingService } from './fixedBackgroundLoadingService';
import { enhancedPredictiveService } from './enhancedPredictiveService';
import { conversationRelationshipEngine } from './conversationRelationshipEngine';
import { messageCacheService } from './messageCacheService';
import { messageSearchService } from './messageSearchService';
import { messageThreadingService } from './messageThreadingService';
import { messageCategorizationService } from './messageCategorizationService';

interface EnhancedConversationFilters {
  search?: string;
  unreadOnly?: boolean;
  incomingOnly?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  leadSources?: string[];
  aiStages?: string[];
  categories?: string[];
  urgency?: string[];
}

class EnhancedConversationService {
  private searchIndex = new Map<string, any>();
  private lastConversationLoad = 0;
  private readonly LOAD_DEBOUNCE = 1000; // 1 second

  // Enhanced conversation loading with advanced predictive features and search integration
  async getConversationsWithPrediction(
    page = 0, 
    limit = 50, 
    filters: EnhancedConversationFilters = {}
  ) {
    console.log('🚀 [ENHANCED] Loading conversations with advanced prediction and search, page:', page);

    // Debounce rapid requests
    const now = Date.now();
    if (now - this.lastConversationLoad < this.LOAD_DEBOUNCE) {
      console.log('⏰ [ENHANCED] Debouncing conversation load request');
      await new Promise(resolve => setTimeout(resolve, this.LOAD_DEBOUNCE));
    }
    this.lastConversationLoad = now;

    try {
      // Build the query with correct column names
      let query = supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          source,
          vehicle_interest,
          status,
          salesperson_id,
          ai_stage,
          ai_opt_in,
          ai_messages_sent,
          ai_sequence_paused,
          created_at,
          phone_numbers!inner(number, is_primary),
          conversations(id, body, direction, sent_at, read_at),
          profiles(first_name, last_name)
        `)
        .eq('phone_numbers.is_primary', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,vehicle_interest.ilike.%${filters.search}%`);
      }

      if (filters.leadSources?.length) {
        query = query.in('source', filters.leadSources);
      }

      if (filters.aiStages?.length) {
        query = query.in('ai_stage', filters.aiStages);
      }

      // Execute query with pagination
      const { data: leads, error, count } = await query
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      // Transform to conversation list items
      const conversations: ConversationListItem[] = leads?.map(lead => {
        const messages = lead.conversations || [];
        const lastMessage = messages[messages.length - 1];
        const unreadMessages = messages.filter(msg => msg.direction === 'in' && !msg.read_at);

        return {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`.trim(),
          primaryPhone: lead.phone_numbers[0]?.number || '',
          leadPhone: lead.phone_numbers[0]?.number || '',
          lastMessage: lastMessage?.body || 'No messages yet',
          lastMessageTime: lastMessage?.sent_at || lead.created_at,
          lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null || null,
          unreadCount: unreadMessages.length,
          messageCount: messages.length,
          salespersonId: lead.salesperson_id,
          vehicleInterest: lead.vehicle_interest || '',
          status: lead.status || 'new',
          lastMessageDate: new Date(lastMessage?.sent_at || lead.created_at),
          salespersonName: lead.profiles?.first_name 
            ? `${lead.profiles.first_name} ${lead.profiles.last_name}`.trim()
            : undefined,
          aiOptIn: lead.ai_opt_in,
          leadSource: lead.source,
          aiStage: lead.ai_stage,
          aiMessagesSent: lead.ai_messages_sent,
          aiSequencePaused: lead.ai_sequence_paused,
          incomingCount: messages.filter(m => m.direction === 'in').length,
          outgoingCount: messages.filter(m => m.direction === 'out').length
        };
      }) || [];

      // Apply post-processing filters
      let filteredConversations = conversations;

      if (filters.unreadOnly) {
        filteredConversations = filteredConversations.filter(c => c.unreadCount > 0);
      }

      if (filters.incomingOnly) {
        filteredConversations = filteredConversations.filter(c => c.lastMessageDirection === 'in');
      }

      // Build conversation relationships for contextual loading
      conversationRelationshipEngine.buildRelationships(filteredConversations);

      // Update enhanced predictive service search index
      enhancedPredictiveService.updateSearchIndex(filteredConversations);

      // Generate enhanced predictions with ML - with safety checks
      let predictions = [];
      try {
        predictions = await enhancedPredictiveService.predictConversationsToPreload(
          filteredConversations, 
          new Date(),
          { searchQuery: filters.search }
        );
        
        if (!Array.isArray(predictions)) {
          predictions = [];
        }
      } catch (error) {
        console.error('❌ [ENHANCED] Error generating predictions:', error);
        predictions = [];
      }

      console.log(`📊 [ENHANCED] Generated ${predictions.length} ML-powered predictions`);

      return {
        conversations: filteredConversations,
        totalCount: count || 0,
        hasMore: conversations.length === limit,
        predictions
      };

    } catch (error) {
      console.error('❌ [ENHANCED] Error loading conversations:', error);
      throw error;
    }
  }

  // Enhanced message loading with search integration
  async getMessagesWithPrediction(leadId: string, context?: any): Promise<MessageData[]> {
    console.log('📱 [ENHANCED] Loading messages with search integration for lead:', leadId);

    // Check if messages are preloaded by fixed background service
    const preloaded = fixedBackgroundLoadingService.getPreloadedMessages(leadId);
    if (preloaded) {
      console.log('⚡ [ENHANCED] Using fixed preloaded messages for:', leadId);
      this.updateSearchServices(preloaded);
      enhancedPredictiveService.trackConversationAccess(leadId, leadId, undefined, context);
      return preloaded;
    }

    // Check cache
    const cached = messageCacheService.getCachedMessages(leadId);
    if (cached) {
      console.log('💾 [ENHANCED] Using cached messages for:', leadId);
      this.updateSearchServices(cached);
      enhancedPredictiveService.trackConversationAccess(leadId, leadId, undefined, context);
      return cached;
    }

    // Load from database with timing
    const startTime = Date.now();
    
    try {
      const messages = await enhancedPredictiveService.loadMessagesFromDatabase(leadId);

      // Cache the messages
      messageCacheService.cacheMessages(leadId, messages);

      // Update search services with new messages
      this.updateSearchServices(messages);

      // Track access with enhanced context
      const timeSpent = Date.now() - startTime;
      enhancedPredictiveService.trackConversationAccess(leadId, leadId, timeSpent, context);

      // Schedule immediate background loading for related conversations
      const related = conversationRelationshipEngine.getRelatedConversations(leadId, 2);
      if (Array.isArray(related)) {
        related.forEach(relatedId => {
          fixedBackgroundLoadingService.scheduleImmediate(relatedId);
        });
      }

      console.log(`📦 [ENHANCED] Loaded ${messages.length} messages for lead ${leadId} in ${timeSpent}ms`);
      return messages;

    } catch (error) {
      console.error('❌ [ENHANCED] Error loading messages:', error);
      throw error;
    }
  }

  // Update search services when new messages are loaded
  private updateSearchServices(messages: MessageData[]) {
    // Update search index
    messageSearchService.buildSearchIndex(messages);
    
    // Categorize messages
    const messageData = messages.map(msg => ({
      id: msg.id,
      content: msg.body,
      metadata: {
        direction: msg.direction,
        sentAt: msg.sentAt,
        aiGenerated: msg.aiGenerated,
        leadId: msg.leadId
      }
    }));
    messageCategorizationService.categorizeMessages(messageData);
    
    // Create threads by lead
    const messagesByLead = messages.reduce((acc, msg) => {
      if (!acc[msg.leadId]) acc[msg.leadId] = [];
      acc[msg.leadId].push(msg);
      return acc;
    }, {} as Record<string, MessageData[]>);
    
    Object.entries(messagesByLead).forEach(([leadId, leadMessages]) => {
      messageThreadingService.analyzeAndCreateThreads(leadMessages, leadId);
    });
  }

  // Enhanced search with advanced categorization and threading
  searchConversations(query: string, filters: EnhancedConversationFilters = {}, limit = 10): ConversationListItem[] {
    console.log('🔍 [ENHANCED] Advanced search for:', query);
    
    // Perform message search
    const messageResults = messageSearchService.search(query, {
      categories: filters.categories,
      dateRange: filters.dateRange,
      direction: filters.search ? 'both' : undefined,
      leadIds: filters.leadSources,
      minRelevanceScore: 0.3
    }, limit * 3);
    
    // Extract unique lead IDs from message results
    const leadIds = [...new Set(messageResults.map(result => result.leadId))];
    
    // Use enhanced predictive service for additional ML-powered search
    const mlResults = enhancedPredictiveService.searchConversations(query, limit);
    
    // Combine and deduplicate results
    const combinedLeadIds = [...new Set([...leadIds, ...mlResults.map(r => r.leadId)])];
    
    // Filter conversations by found lead IDs
    const conversations = this.getAllConversations()
      .filter(conv => combinedLeadIds.includes(conv.leadId))
      .slice(0, limit);
    
    console.log(`🎯 [ENHANCED] Found ${conversations.length} conversations from advanced search`);
    return conversations;
  }

  // Search within threads
  searchThreads(query: string, leadId?: string) {
    if (leadId) {
      const threads = messageThreadingService.getThreadsForLead(leadId);
      return threads.filter(thread => 
        thread.subject.toLowerCase().includes(query.toLowerCase()) ||
        thread.summary?.toLowerCase().includes(query.toLowerCase()) ||
        thread.messages.some(msg => msg.content.toLowerCase().includes(query.toLowerCase()))
      );
    }
    
    return messageThreadingService.searchThreads(query);
  }

  // Get categorized messages
  getCategorizedMessages(categories: string[]) {
    return messageCategorizationService.searchByCategory(categories);
  }

  // Get urgent messages
  getUrgentMessages() {
    return messageCategorizationService.getUrgentMessages();
  }

  // Get messages requiring action
  getActionRequiredMessages() {
    return messageCategorizationService.getActionRequiredMessages();
  }

  // Get comprehensive search analytics
  getSearchAnalytics() {
    return {
      search: messageSearchService.getSearchAnalytics(),
      categorization: messageCategorizationService.getAnalytics(),
      threading: messageThreadingService.getAnalytics()
    };
  }

  // Helper method to get all conversations (would need to be implemented based on your data structure)
  private getAllConversations(): ConversationListItem[] {
    // This would typically return cached conversations from your state management
    // For now, return empty array as placeholder
    return [];
  }

  // Get advanced prediction insights
  getPredictionInsights() {
    return {
      enhanced: enhancedPredictiveService.getPredictionInsights(),
      backgroundLoading: fixedBackgroundLoadingService.getPerformanceMetrics(),
      queueStatus: fixedBackgroundLoadingService.getQueueStatus(),
      relationships: conversationRelationshipEngine.getGlobalInsights(),
      search: this.getSearchAnalytics()
    };
  }

  // Schedule urgent loading for immediate access
  scheduleUrgentLoading(leadId: string, reason = 'user requested') {
    fixedBackgroundLoadingService.scheduleImmediate(leadId);
  }

  // Get performance metrics for monitoring
  getPerformanceMetrics() {
    return fixedBackgroundLoadingService.getPerformanceMetrics();
  }

  // Stop all background services
  stop() {
    fixedBackgroundLoadingService.stop();
    messageSearchService.clearCache();
    messageCategorizationService.clearCache();
    console.log('🛑 [ENHANCED] All enhanced services stopped');
  }
}

export const enhancedConversationService = new EnhancedConversationService();
