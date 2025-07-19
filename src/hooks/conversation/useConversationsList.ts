
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem } from './conversationTypes';

export const useConversationsList = () => {
  const { profile, user, session } = useAuth();

  const { data: conversations = [], isLoading: conversationsLoading, error, refetch: refetchConversations } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('🔄 [INBOX-TRACE] Starting conversations query...', {
        timestamp: new Date().toISOString(),
        profileId: profile?.id,
        userEmail: user?.email,
        sessionExists: !!session,
        memory: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        } : 'unavailable'
      });

      if (!profile) {
        console.log('❌ [INBOX-TRACE] No profile found, returning empty array');
        return [];
      }

      try {
        // First, let's test basic database connectivity
        const { data: testQuery, error: testError } = await supabase
          .from('leads')
          .select('id')  
          .limit(1);

        if (testError) {
          console.error('❌ [INBOX-TRACE] Database connectivity test failed:', testError);
          throw new Error(`Database connection failed: ${testError.message}`);
        }

        console.log('✅ [INBOX-TRACE] Database connectivity verified');

        // Try to call the RPC function
        const { data: conversationsData, error } = await supabase.rpc('get_inbox_conversations_prioritized_limited');

        if (error) {
          console.error('❌ [INBOX-TRACE] RPC function failed:', error);
          
          // Fallback to basic query if RPC fails
          console.log('🔄 [INBOX-TRACE] Attempting fallback query...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('conversations')
            .select(`
              id,
              lead_id,
              body,
              direction,
              sent_at,
              read_at,
              leads!inner (
                id,
                first_name,
                last_name,
                phone_numbers (
                  number,
                  is_primary
                )
              )
            `)
            .order('sent_at', { ascending: false })
            .limit(50);

          if (fallbackError) {
            console.error('❌ [INBOX-TRACE] Fallback query also failed:', fallbackError);
            throw fallbackError;
          }

          console.log('✅ [INBOX-TRACE] Fallback query successful, processing data...');
          
          // Process fallback data into conversations format
          const conversationMap = new Map<string, ConversationListItem>();
          
          fallbackData?.forEach(conv => {
            const leadId = conv.lead_id;
            const lead = conv.leads;
            const primaryPhone = lead.phone_numbers?.find(p => p.is_primary)?.number || 
                               lead.phone_numbers?.[0]?.number || '';

            if (!conversationMap.has(leadId)) {
              conversationMap.set(leadId, {
                leadId,
                leadName: `${lead.first_name} ${lead.last_name}`,
                primaryPhone,
                leadPhone: primaryPhone,
                leadEmail: '',
                lastMessage: conv.body,
                lastMessageTime: new Date(conv.sent_at).toLocaleString(),
                lastMessageDirection: conv.direction as 'in' | 'out',
                lastMessageDate: new Date(conv.sent_at),
                unreadCount: conv.direction === 'in' && !conv.read_at ? 1 : 0,
                messageCount: 1,
                salespersonId: null,
                vehicleInterest: '',
                leadSource: '',
                leadType: 'unknown',
                status: 'new',
                aiOptIn: false
              });
            }
          });

          return Array.from(conversationMap.values());
        }

        console.log('📊 [INBOX-TRACE] Raw conversations data received (LIMITED):', {
          count: conversationsData?.length || 0,
          firstFew: conversationsData?.slice(0, 3).map(conv => ({
            leadId: conv.lead_id,
            direction: conv.direction,
            sentAt: conv.sent_at,
            unreadCount: conv.unread_count,
            phone: conv.primary_phone,
            name: `${conv.first_name} ${conv.last_name}`,
            lastMessage: conv.body?.substring(0, 50) + '...'
          })) || [],
          inboundCount: conversationsData?.filter(conv => conv.direction === 'in').length || 0,
          outboundCount: conversationsData?.filter(conv => conv.direction === 'out').length || 0,
          totalUnread: conversationsData?.reduce((sum, conv) => sum + (Number(conv.unread_count) || 0), 0) || 0
        });

        // Process conversations into list format
        const conversationListMap = new Map<string, ConversationListItem>();

        conversationsData?.forEach(conv => {
          const leadId = conv.lead_id;
          const primaryPhone = conv.primary_phone || '';

          const conversationItem: ConversationListItem = {
            leadId,
            leadName: `${conv.first_name} ${conv.last_name}`,
            primaryPhone,
            leadPhone: primaryPhone,
            leadEmail: conv.email || '',
            lastMessage: conv.body,
            lastMessageTime: new Date(conv.sent_at).toLocaleString(),
            lastMessageDirection: conv.direction as 'in' | 'out',
            lastMessageDate: new Date(conv.sent_at),
            unreadCount: Number(conv.unread_count) || 0,
            messageCount: 1,
            salespersonId: conv.salesperson_id,
            vehicleInterest: conv.vehicle_interest || '',
            leadSource: conv.source || '',
            leadType: conv.lead_type_name || 'unknown',
            status: conv.status || 'new',
            salespersonName: conv.profiles_first_name && conv.profiles_last_name ? `${conv.profiles_first_name} ${conv.profiles_last_name}` : undefined,
            aiOptIn: conv.ai_opt_in || false
          };

          conversationListMap.set(leadId, conversationItem);
        });

        const result = Array.from(conversationListMap.values());
        const endTime = performance.now();
        
        console.log(`✅ [INBOX-TRACE] Conversations processing complete:`, {
          totalConversations: result.length,
          processingTime: Math.round(endTime - startTime) + 'ms'
        });
        
        return result;

      } catch (err) {
        console.error('❌ [STABLE CONV] Error loading conversations:', err);
        throw err;
      }
    },
    enabled: !!profile,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Log any errors
  if (error) {
    console.error('❌ [CONVERSATIONS LIST] Query error:', error);
  }

  return {
    conversations,
    conversationsLoading,
    refetchConversations,
    error
  };
};
