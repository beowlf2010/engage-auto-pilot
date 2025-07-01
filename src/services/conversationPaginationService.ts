
import { supabase } from '@/integrations/supabase/client';
import type { ConversationData } from '@/types/conversation';

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationState;
}

class ConversationPaginationService {
  private pageSize = 25; // Reduced from loading all conversations
  
  async fetchConversations(
    profile: any,
    page: number = 1,
    searchQuery?: string
  ): Promise<PaginatedResult<ConversationData>> {
    try {
      console.log(`📄 [PAGINATION] Fetching page ${page} with ${this.pageSize} items`);
      
      const offset = (page - 1) * this.pageSize;
      
      // Build query with pagination - include created_at field
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
          created_at,
          phone_numbers!inner (
            number,
            is_primary
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + this.pageSize - 1);

      // Add search filter if provided
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},vehicle_interest.ilike.${searchTerm}`);
      }

      const { data: leadsData, error: leadsError, count } = await query;

      if (leadsError) throw leadsError;

      if (!leadsData || leadsData.length === 0) {
        return {
          data: [],
          pagination: {
            currentPage: page,
            pageSize: this.pageSize,
            totalCount: count || 0,
            hasMore: false,
            loading: false
          }
        };
      }

      const leadIds = leadsData.map(lead => lead.id);

      // Get latest conversations for these leads
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .in('lead_id', leadIds)
        .order('sent_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Process conversations efficiently
      const conversationMap = new Map();
      const unreadCountMap = new Map();

      conversationsData?.forEach(conv => {
        const leadId = conv.lead_id;
        
        // Track latest conversation
        if (!conversationMap.has(leadId) || 
            new Date(conv.sent_at) > new Date(conversationMap.get(leadId).sent_at)) {
          conversationMap.set(leadId, conv);
        }

        // Count unread incoming messages
        if (conv.direction === 'in' && !conv.read_at) {
          const currentCount = unreadCountMap.get(leadId) || 0;
          unreadCountMap.set(leadId, currentCount + 1);
        }
      });

      // Build conversation data
      const conversations: ConversationData[] = leadsData.map(lead => {
        const latestConversation = conversationMap.get(lead.id);
        const primaryPhone = lead.phone_numbers.find(p => p.is_primary) || lead.phone_numbers[0];

        return {
          leadId: lead.id,
          leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
          leadPhone: primaryPhone?.number || 'No phone',
          vehicleInterest: lead.vehicle_interest || 'Not specified',
          lastMessage: latestConversation?.body || 'No messages',
          lastMessageTime: latestConversation?.sent_at || lead.created_at,
          unreadCount: unreadCountMap.get(lead.id) || 0,
          status: lead.status || 'new',
          aiOptIn: lead.ai_opt_in || false,
          salespersonId: lead.salesperson_id
        };
      });

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: this.pageSize,
          totalCount: count || 0,
          hasMore: (count || 0) > offset + this.pageSize,
          loading: false
        }
      };

    } catch (error) {
      console.error('❌ [PAGINATION] Error fetching conversations:', error);
      throw error;
    }
  }

  setPageSize(size: number): void {
    this.pageSize = Math.max(10, Math.min(100, size)); // Constrain between 10-100
  }

  getPageSize(): number {
    return this.pageSize;
  }
}

export const conversationPaginationService = new ConversationPaginationService();
