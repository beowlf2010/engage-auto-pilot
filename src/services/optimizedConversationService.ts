
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

    console.log('🔄 [OPTIMIZED] Fetching conversations with single optimized query...');
    
    try {
      // Single optimized query with CTEs and window functions
      const query = `
        WITH lead_stats AS (
          SELECT 
            l.id as lead_id,
            l.first_name,
            l.last_name,
            l.vehicle_interest,
            l.status,
            l.salesperson_id,
            l.ai_opt_in,
            l.source,
            l.created_at as lead_created_at,
            p.first_name as salesperson_first_name,
            p.last_name as salesperson_last_name,
            ph.number as primary_phone,
            COALESCE(
              COUNT(c.id) FILTER (WHERE c.direction = 'in' AND c.read_at IS NULL), 
              0
            ) as unread_count,
            COUNT(c.id) FILTER (WHERE c.direction = 'in') as incoming_count,
            COUNT(c.id) FILTER (WHERE c.direction = 'out') as outgoing_count,
            COUNT(c.id) as total_messages
          FROM leads l
          LEFT JOIN profiles p ON l.salesperson_id = p.id
          LEFT JOIN phone_numbers ph ON l.id = ph.lead_id AND ph.is_primary = true
          LEFT JOIN conversations c ON l.id = c.lead_id
          WHERE l.ai_opt_in IS NOT NULL
          GROUP BY l.id, l.first_name, l.last_name, l.vehicle_interest, l.status, 
                   l.salesperson_id, l.ai_opt_in, l.source, l.created_at,
                   p.first_name, p.last_name, ph.number
        ),
        latest_messages AS (
          SELECT DISTINCT ON (lead_id)
            lead_id,
            body as last_message,
            sent_at as last_message_time,
            direction as last_message_direction
          FROM conversations
          ORDER BY lead_id, sent_at DESC
        ),
        filtered_leads AS (
          SELECT 
            ls.*,
            lm.last_message,
            lm.last_message_time,
            lm.last_message_direction,
            CASE 
              WHEN ls.unread_count > 0 THEN 1
              ELSE 2
            END as priority_order
          FROM lead_stats ls
          LEFT JOIN latest_messages lm ON ls.lead_id = lm.lead_id
          WHERE 
            (ls.total_messages > 0 OR $1::text IS NULL)
            AND ($2::boolean IS NULL OR ($2 = true AND ls.unread_count > 0))
            AND ($3::boolean IS NULL OR ($3 = true AND lm.last_message_direction = 'in'))
            AND ($4::text IS NULL OR (
              LOWER(ls.first_name || ' ' || ls.last_name) LIKE LOWER('%' || $4 || '%')
              OR LOWER(ls.vehicle_interest) LIKE LOWER('%' || $4 || '%')
              OR ls.primary_phone LIKE '%' || $4 || '%'
            ))
        )
        SELECT 
          *,
          COUNT(*) OVER() as total_count
        FROM filtered_leads
        ORDER BY 
          priority_order ASC,
          last_message_time DESC NULLS LAST,
          lead_created_at DESC
        LIMIT $5 OFFSET $6
      `;

      const { data, error } = await supabase.rpc('exec_raw_sql', {
        sql: query,
        params: [
          filters.incomingOnly ? 'messages_required' : null,
          filters.unreadOnly || null,
          filters.incomingOnly || null,
          filters.search || null,
          pageSize,
          page * pageSize
        ]
      });

      if (error) {
        console.error('❌ [OPTIMIZED] Query error:', error);
        throw error;
      }

      const conversations: ConversationListItem[] = (data || []).map((row: any) => ({
        leadId: row.lead_id,
        leadName: `${row.first_name} ${row.last_name}`,
        leadPhone: row.primary_phone || 'No phone',
        primaryPhone: row.primary_phone || 'No phone',
        vehicleInterest: row.vehicle_interest || 'Unknown',
        leadSource: row.source || 'Unknown',
        unreadCount: row.unread_count,
        messageCount: row.total_messages,
        lastMessage: row.last_message || 'No messages yet',
        lastMessageTime: row.last_message_time ? 
          new Date(row.last_message_time).toLocaleString() : 'Never',
        lastMessageDirection: row.last_message_direction as 'in' | 'out' | null,
        lastMessageDate: row.last_message_time ? 
          new Date(row.last_message_time) : new Date(0),
        status: row.status || 'new',
        salespersonId: row.salesperson_id,
        salespersonName: row.salesperson_first_name && row.salesperson_last_name ?
          `${row.salesperson_first_name} ${row.salesperson_last_name}` : undefined,
        aiOptIn: row.ai_opt_in,
        incomingCount: row.incoming_count,
        outgoingCount: row.outgoing_count
      }));

      const totalCount = data?.length > 0 ? data[0].total_count : 0;
      const hasMore = (page + 1) * pageSize < totalCount;

      const result = { conversations, totalCount, hasMore };
      
      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`✅ [OPTIMIZED] Loaded ${conversations.length} conversations (page ${page + 1})`);
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
