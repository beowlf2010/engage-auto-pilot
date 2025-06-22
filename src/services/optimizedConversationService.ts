
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

    console.log('🔄 [OPTIMIZED] Fetching conversations with bulletproof unread prioritization...');
    
    try {
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

      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,vehicle_interest.ilike.%${filters.search}%`);
      }

      const { data: leadData, error, count } = await query.returns<any[]>();

      if (error) {
        console.error('❌ [OPTIMIZED] Query error:', error);
        throw error;
      }

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

      let filteredConversations = conversations;
      
      if (filters.unreadOnly) {
        filteredConversations = conversations.filter(conv => conv.unreadCount > 0);
      }
      
      if (filters.incomingOnly) {
        filteredConversations = conversations.filter(conv => conv.lastMessageDirection === 'in');
      }

      // 🚨 BULLETPROOF UNREAD PRIORITIZATION - MULTIPLE FAILSAFES 🚨
      console.log('🔥 [BULLETPROOF] Applying unread message prioritization with multiple failsafes');
      
      filteredConversations.sort((a, b) => {
        // FAILSAFE 1: Absolute priority for unread messages
        const aHasUnread = a.unreadCount > 0;
        const bHasUnread = b.unreadCount > 0;
        
        if (aHasUnread && !bHasUnread) {
          console.log(`📌 [PRIORITY] ${a.leadName} (${a.unreadCount} unread) over ${b.leadName} (${b.unreadCount} unread)`);
          return -1; // a comes first
        }
        if (!aHasUnread && bHasUnread) {
          console.log(`📌 [PRIORITY] ${b.leadName} (${b.unreadCount} unread) over ${a.leadName} (${a.unreadCount} unread)`);
          return 1; // b comes first
        }
        
        // FAILSAFE 2: Within unread messages, prioritize by count
        if (aHasUnread && bHasUnread) {
          if (a.unreadCount !== b.unreadCount) {
            return b.unreadCount - a.unreadCount; // Higher unread count first
          }
        }
        
        // FAILSAFE 3: Same unread status, sort by most recent message
        const aTime = a.lastMessageDate ? a.lastMessageDate.getTime() : 0;
        const bTime = b.lastMessageDate ? b.lastMessageDate.getTime() : 0;
        return bTime - aTime;
      });

      // FAILSAFE 4: Double-check unread prioritization after sort
      const unreadConversations = filteredConversations.filter(c => c.unreadCount > 0);
      const readConversations = filteredConversations.filter(c => c.unreadCount === 0);
      
      // Force unread conversations to the top
      const finalConversations = [...unreadConversations, ...readConversations];
      
      console.log(`✅ [BULLETPROOF] Final sort verification:`, {
        totalConversations: finalConversations.length,
        unreadConversations: unreadConversations.length,
        readConversations: readConversations.length,
        firstFiveUnreadCounts: finalConversations.slice(0, 5).map(c => ({ name: c.leadName, unread: c.unreadCount }))
      });

      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedConversations = finalConversations.slice(startIndex, endIndex);

      const totalCount = finalConversations.length;
      const hasMore = endIndex < totalCount;

      const result = { 
        conversations: paginatedConversations, 
        totalCount, 
        hasMore 
      };
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`✅ [OPTIMIZED] Loaded ${paginatedConversations.length} conversations (page ${page + 1})`);
      console.log(`📊 [BULLETPROOF] Unread conversations on this page:`, 
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
