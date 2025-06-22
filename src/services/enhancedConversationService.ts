
import { supabase } from '@/integrations/supabase/client';
import { ConversationListItem, MessageData } from '@/types/conversation';
import { predictiveMessageService } from './predictiveMessageService';
import { messageCacheService } from './messageCacheService';

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
}

class EnhancedConversationService {
  private backgroundLoadingEnabled = true;
  private searchIndex = new Map<string, any>();
  private lastPreloadTime = 0;
  private readonly PRELOAD_INTERVAL = 30000; // 30 seconds

  // Enhanced conversation loading with predictive features
  async getConversationsWithPrediction(
    page = 0, 
    limit = 50, 
    filters: EnhancedConversationFilters = {}
  ) {
    console.log('🚀 [ENHANCED] Loading conversations with prediction, page:', page);

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

      // Generate predictions and start background preloading
      if (this.backgroundLoadingEnabled && page === 0) {
        this.startPredictivePreloading(filteredConversations);
      }

      // Update search index
      this.updateSearchIndex(filteredConversations);

      return {
        conversations: filteredConversations,
        totalCount: count || 0,
        hasMore: conversations.length === limit,
        predictions: await predictiveMessageService.predictConversationsToPreload(filteredConversations)
      };

    } catch (error) {
      console.error('❌ [ENHANCED] Error loading conversations:', error);
      throw error;
    }
  }

  // Enhanced message loading with cache check and prediction tracking
  async getMessagesWithPrediction(leadId: string): Promise<MessageData[]> {
    console.log('📱 [ENHANCED] Loading messages for lead:', leadId);

    // Check if messages are preloaded
    const preloaded = predictiveMessageService.getPreloadedMessages(leadId);
    if (preloaded) {
      console.log('⚡ [ENHANCED] Using preloaded messages for:', leadId);
      // Track successful prediction
      predictiveMessageService.trackConversationAccess(leadId, leadId);
      return preloaded;
    }

    // Check cache
    const cached = messageCacheService.getCachedMessages(leadId);
    if (cached) {
      console.log('💾 [ENHANCED] Using cached messages for:', leadId);
      predictiveMessageService.trackConversationAccess(leadId, leadId);
      return cached;
    }

    // Load from database
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      const messages: MessageData[] = data.map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        body: msg.body,
        direction: msg.direction as 'in' | 'out',
        sentAt: msg.sent_at,
        readAt: msg.read_at,
        smsStatus: msg.sms_status || 'delivered',
        aiGenerated: msg.ai_generated || false,
        smsError: msg.sms_error
      }));

      // Cache the messages
      messageCacheService.cacheMessages(leadId, messages);

      // Track access with timing
      const timeSpent = Date.now() - startTime;
      predictiveMessageService.trackConversationAccess(leadId, leadId, timeSpent);

      console.log(`📦 [ENHANCED] Loaded ${messages.length} messages for lead:`, leadId);
      return messages;

    } catch (error) {
      console.error('❌ [ENHANCED] Error loading messages:', error);
      throw error;
    }
  }

  // Start predictive preloading in background
  private async startPredictivePreloading(conversations: ConversationListItem[]) {
    const now = Date.now();
    
    // Throttle preloading to avoid excessive requests
    if (now - this.lastPreloadTime < this.PRELOAD_INTERVAL) {
      return;
    }
    
    this.lastPreloadTime = now;

    try {
      const predictions = await predictiveMessageService.predictConversationsToPreload(conversations);
      
      // Start preloading in background (don't await)
      predictiveMessageService.preloadMessages(
        predictions,
        (leadId) => this.loadMessagesFromDatabase(leadId)
      ).catch(error => {
        console.error('❌ [ENHANCED] Background preloading failed:', error);
      });

      // Cleanup old preloaded data
      const activeLeadIds = conversations.slice(0, 10).map(c => c.leadId);
      predictiveMessageService.cleanupPreloadedData(activeLeadIds);

    } catch (error) {
      console.error('❌ [ENHANCED] Predictive preloading setup failed:', error);
    }
  }

  // Internal method to load messages from database
  private async loadMessagesFromDatabase(leadId: string): Promise<MessageData[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    return data.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      body: msg.body,
      direction: msg.direction as 'in' | 'out',
      sentAt: msg.sent_at,
      readAt: msg.read_at,
      smsStatus: msg.sms_status || 'delivered',
      aiGenerated: msg.ai_generated || false,
      smsError: msg.sms_error
    }));
  }

  // Update search index for fast searching
  private updateSearchIndex(conversations: ConversationListItem[]) {
    conversations.forEach(conv => {
      const searchableText = [
        conv.leadName,
        conv.primaryPhone,
        conv.vehicleInterest,
        conv.lastMessage,
        conv.leadSource
      ].filter(Boolean).join(' ').toLowerCase();

      this.searchIndex.set(conv.leadId, {
        conversation: conv,
        searchableText
      });
    });
  }

  // Fast search across conversations
  searchConversations(query: string, limit = 10): ConversationListItem[] {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const results: ConversationListItem[] = [];

    for (const [, item] of this.searchIndex) {
      if (item.searchableText.includes(searchTerm)) {
        results.push(item.conversation);
      }

      if (results.length >= limit) break;
    }

    return results.sort((a, b) => b.unreadCount - a.unreadCount);
  }

  // Get prediction insights for debugging
  getPredictionInsights() {
    return predictiveMessageService.getPredictionInsights();
  }

  // Toggle background loading
  setBackgroundLoading(enabled: boolean) {
    this.backgroundLoadingEnabled = enabled;
    console.log('🔄 [ENHANCED] Background loading:', enabled ? 'enabled' : 'disabled');
  }
}

export const enhancedConversationService = new EnhancedConversationService();
