
import { supabase } from '@/integrations/supabase/client';
import { ConversationListItem } from '@/types/conversation';

export interface PaginatedConversations {
  conversations: ConversationListItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface ConversationFilters {
  search?: string;
  unreadOnly?: boolean;
  incomingOnly?: boolean;
}

class OptimizedConversationService {
  private cache = new Map<string, { data: PaginatedConversations; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private readonly PAGE_SIZE = 50;

  private getCacheKey(page: number, filters: ConversationFilters): string {
    return `conversations_${page}_${JSON.stringify(filters)}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async getConversations(
    page = 0, 
    pageSize = this.PAGE_SIZE,
    filters: ConversationFilters = {}
  ): Promise<PaginatedConversations> {
    const cacheKey = this.getCacheKey(page, filters);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValidCache(cached.timestamp)) {
      console.log('📋 [OPTIMIZED] Using cached conversations for page:', page);
      return cached.data;
    }

    console.log('🔄 [OPTIMIZED] Fetching conversations with optimized query...');
    
    try {
      // Use a more efficient query with smart ordering to prioritize unread conversations
      let query = supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          vehicle_interest,
          status,
          salesperson_id,
          ai_opt_in,
          source,
          created_at,
          last_reply_at,
          profiles!leads_salesperson_id_fkey(first_name, last_name),
          phone_numbers!inner(number, is_primary),
          conversations(id, body, sent_at, direction, read_at)
        `)
        .eq('phone_numbers.is_primary', true);

      // Apply search filter early if provided
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,vehicle_interest.ilike.%${filters.search}%`);
      }

      // Get the data first (we'll sort and paginate in memory for better unread prioritization)
      const { data: leadData, error, count } = await query.returns<any[]>();

      if (error) {
        console.error('❌ [OPTIMIZED] Query error:', error);
        throw error;
      }

      // Process and transform the data
      const conversations: ConversationListItem[] = (leadData || []).map((lead: any) => {
        const messages = lead.conversations || [];
        const unreadMessages = messages.filter((msg: any) => msg.direction === 'in' && !msg.read_at);
        const lastMessage = messages.length > 0 ? 
          messages.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0] : null;

        return {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          leadPhone: lead.phone_numbers?.[0]?.number || 'No phone',
          primaryPhone: lead.phone_numbers?.[0]?.number || 'No phone',
          vehicleInterest: lead.vehicle_interest || 'Unknown',
          leadSource: lead.source || 'Unknown',
          unreadCount: unreadMessages.length,
          messageCount: messages.length,
          lastMessage: lastMessage?.body || 'No messages yet',
          lastMessageTime: lastMessage?.sent_at ? 
            new Date(lastMessage.sent_at).toLocaleString() : 'Never',
          lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null,
          lastMessageDate: lastMessage?.sent_at ? 
            new Date(lastMessage.sent_at) : new Date(0),
          status: lead.status || 'new',
          salespersonId: lead.salesperson_id,
          salespersonName: lead.profiles?.first_name && lead.profiles?.last_name ?
            `${lead.profiles.first_name} ${lead.profiles.last_name}` : undefined,
          aiOptIn: lead.ai_opt_in,
          incomingCount: messages.filter((msg: any) => msg.direction === 'in').length,
          outgoingCount: messages.filter((msg: any) => msg.direction === 'out').length
        };
      });

      // Apply post-query filters
      let filteredConversations = conversations;
      
      if (filters.unreadOnly) {
        filteredConversations = conversations.filter(conv => conv.unreadCount > 0);
      }
      
      if (filters.incomingOnly) {
        filteredConversations = conversations.filter(conv => conv.lastMessageDirection === 'in');
      }

      // CRITICAL FIX: Smart sorting to prioritize unread conversations
      filteredConversations.sort((a, b) => {
        // First priority: unread count (conversations with unread messages first)
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        
        // Second priority: within unread conversations, sort by unread count (highest first)
        if (a.unreadCount > 0 && b.unreadCount > 0) {
          if (a.unreadCount !== b.unreadCount) {
            return b.unreadCount - a.unreadCount;
          }
        }
        
        // Third priority: sort by last message time (most recent first)
        return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
      });

      // Apply pagination AFTER sorting to ensure unread conversations are in first pages
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedConversations = filteredConversations.slice(startIndex, endIndex);

      const totalCount = filteredConversations.length;
      const hasMore = endIndex < totalCount;

      const result = { 
        conversations: paginatedConversations, 
        totalCount, 
        hasMore 
      };
      
      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`✅ [OPTIMIZED] Loaded ${paginatedConversations.length} conversations (page ${page + 1})`);
      console.log(`📊 [OPTIMIZED] Unread conversations on this page:`, 
        paginatedConversations.filter(c => c.unreadCount > 0).length);
      
      return result;

    } catch (error) {
      console.error('❌ [OPTIMIZED] Error loading conversations:', error);
      throw error;
    }
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Pre-load next page for smooth scrolling
  async preloadNextPage(currentPage: number, filters: ConversationFilters = {}): Promise<void> {
    const nextPage = currentPage + 1;
    const cacheKey = this.getCacheKey(nextPage, filters);
    
    if (!this.cache.has(cacheKey)) {
      try {
        await this.getConversations(nextPage, this.PAGE_SIZE, filters);
        console.log('📋 [OPTIMIZED] Pre-loaded page:', nextPage);
      } catch (error) {
        console.warn('⚠️ [OPTIMIZED] Failed to pre-load page:', nextPage, error);
      }
    }
  }
}

export const optimizedConversationService = new OptimizedConversationService();
