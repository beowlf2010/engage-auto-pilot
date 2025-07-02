import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface UseRealDataInboxProps {
  pageSize?: number;
  enableVirtualization?: boolean;
}

export const useRealDataInbox = ({ 
  pageSize = 50, 
  enableVirtualization = true 
}: UseRealDataInboxProps = {}) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});

  // Debounce search for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch conversations with pagination and filters
  const fetchConversations = useCallback(async (pageNum = 0, reset = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📊 [REAL-DATA] Fetching conversations, page:', pageNum);

      // Build query with filters
      let query = supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          body,
          direction,
          sent_at,
          read_at,
          ai_generated,
          leads!inner(
            id,
            first_name,
            last_name,
            vehicle_interest,
            status,
            ai_opt_in,
            created_at
          )
        `)
        .order('sent_at', { ascending: false });

      // Apply search filter
      if (debouncedSearchQuery) {
        query = query.or(`body.ilike.%${debouncedSearchQuery}%,leads.first_name.ilike.%${debouncedSearchQuery}%,leads.last_name.ilike.%${debouncedSearchQuery}%`);
      }

      // Apply filters
      if (filters.hasUnread) {
        query = query.is('read_at', null).eq('direction', 'in');
      }

      if (filters.aiOptIn !== null) {
        query = query.eq('leads.ai_opt_in', filters.aiOptIn);
      }

      // Pagination
      const startIndex = pageNum * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ [REAL-DATA] Error fetching conversations:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Transform data to conversation list format
      const conversationMap = new Map<string, ConversationListItem>();
      
      data?.forEach((conv: any) => {
        const leadId = conv.lead_id;
        const lead = conv.leads;
        
        if (!conversationMap.has(leadId)) {
          conversationMap.set(leadId, {
            leadId,
            leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
            primaryPhone: '', 
            leadPhone: '', 
            leadEmail: '', 
            lastMessage: conv.body,
            lastMessageTime: conv.sent_at,
            lastMessageDate: new Date(conv.sent_at),
            lastMessageDirection: conv.direction as 'in' | 'out',
            unreadCount: 0,
            messageCount: 1,
            salespersonId: null,
            vehicleInterest: lead.vehicle_interest || '',
            leadSource: '',
            leadType: '',
            status: lead.status || '',
            aiOptIn: lead.ai_opt_in
          });
        }

        // Update unread count for incoming messages
        if (conv.direction === 'in' && !conv.read_at) {
          const existing = conversationMap.get(leadId)!;
          existing.unreadCount = (existing.unreadCount || 0) + 1;
        }

        // Keep the most recent message
        const existing = conversationMap.get(leadId)!;
        if (new Date(conv.sent_at) > existing.lastMessageDate) {
          existing.lastMessage = conv.body;
          existing.lastMessageDate = new Date(conv.sent_at);
          existing.lastMessageDirection = conv.direction as 'in' | 'out';
        }
      });

      const newConversations = Array.from(conversationMap.values());
      
      if (reset || pageNum === 0) {
        setConversations(newConversations);
      } else {
        setConversations(prev => [...prev, ...newConversations]);
      }

      setHasMore(newConversations.length === pageSize);
      setPage(pageNum);

      console.log(`✅ [REAL-DATA] Loaded ${newConversations.length} conversations`);

    } catch (error) {
      console.error('❌ [REAL-DATA] Unexpected error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearchQuery, filters, pageSize]);

  // Load more conversations (for infinite scroll)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchConversations(page + 1, false);
    }
  }, [fetchConversations, loading, hasMore, page]);

  // Refresh conversations
  const refresh = useCallback(() => {
    fetchConversations(0, true);
  }, [fetchConversations]);

  // Mark conversation as read
  const markAsRead = useCallback(async (leadId: string) => {
    try {
      console.log('✅ [REAL-DATA] Marking conversation as read:', leadId);

      const { error } = await supabase
        .from('conversations')
        .update({ read_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null);

      if (error) {
        console.error('❌ [REAL-DATA] Error marking as read:', error);
        throw error;
      }

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.leadId === leadId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );

      console.log('✅ [REAL-DATA] Conversation marked as read');
    } catch (error) {
      console.error('❌ [REAL-DATA] Error in markAsRead:', error);
      throw error;
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (leadId: string, message: string) => {
    try {
      console.log('💬 [REAL-DATA] Sending message to:', leadId);

      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          body: message,
          direction: 'out',
          sent_at: new Date().toISOString(),
          ai_generated: false
        });

      if (error) {
        console.error('❌ [REAL-DATA] Error sending message:', error);
        throw error;
      }

      // Refresh conversations to show new message
      refresh();

      console.log('✅ [REAL-DATA] Message sent successfully');
    } catch (error) {
      console.error('❌ [REAL-DATA] Error in sendMessage:', error);
      throw error;
    }
  }, [refresh]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    console.log('🔄 [REAL-DATA] Setting up real-time subscription');

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('🔄 [REAL-DATA] Real-time update:', payload);
          
          // Refresh data on any change
          // In production, you'd want more granular updates
          refresh();
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 [REAL-DATA] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  // Initial fetch and refresh on dependency changes
  useEffect(() => {
    if (user) {
      fetchConversations(0, true);
    }
  }, [user, debouncedSearchQuery, filters]);

  // Virtualized data for performance
  const virtualizedConversations = useMemo(() => {
    if (!enableVirtualization) return conversations;
    
    // Return only visible items for virtual scrolling
    // This would integrate with react-window or similar
    return conversations;
  }, [conversations, enableVirtualization]);

  return {
    // Data
    conversations: virtualizedConversations,
    loading,
    error,
    hasMore,
    
    // Actions
    loadMore,
    refresh,
    markAsRead,
    sendMessage,
    setSearchQuery,
    setFilters,
    
    // State
    searchQuery,
    filters,
    
    // Stats
    totalConversations: conversations.length,
    unreadCount: conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
    
    // Performance
    enableVirtualization
  };
};
