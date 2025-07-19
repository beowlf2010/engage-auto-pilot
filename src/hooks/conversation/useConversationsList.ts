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
      console.log('🔄 [CONVERSATIONS LIST] Starting conversations query...', {
        timestamp: new Date().toISOString(),
        profileId: profile?.id,
        userEmail: user?.email,
        sessionExists: !!session
      });

      if (!profile) {
        console.log('❌ [CONVERSATIONS LIST] No profile found, returning empty array');
        return [];
      }

      try {
        // Step 1: Get all conversations
        const { data: allConversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .order('sent_at', { ascending: false });

        if (convError) {
          console.error('❌ [CONVERSATIONS LIST] Error fetching conversations:', convError);
          throw convError;
        }

        console.log('📊 [CONVERSATIONS LIST] Total conversations found:', allConversations?.length || 0);

        // Step 2: Get all leads separately
        const { data: allLeads, error: leadsError } = await supabase
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            email,
            vehicle_interest,
            status,
            source,
            lead_type_name,
            salesperson_id,
            ai_opt_in,
            phone_numbers (
              number,
              is_primary
            ),
            profiles (
              first_name,
              last_name
            )
          `);

        if (leadsError) {
          console.error('❌ [CONVERSATIONS LIST] Error fetching leads:', leadsError);
          throw leadsError;
        }

        console.log('📊 [CONVERSATIONS LIST] Total leads found:', allLeads?.length || 0);

        // Step 3: Process conversations and group by lead
        const conversationMap = new Map<string, {
          leadData: any;
          latestConversation: any;
          unreadCount: number;
          totalMessages: number;
        }>();

        // Process each conversation
        allConversations?.forEach((conv: any) => {
          const leadId = conv.lead_id;
          if (!leadId) return;

          // Find matching lead data
          const leadData = allLeads?.find(lead => lead.id === leadId);
          if (!leadData) {
            console.warn('⚠️ [CONVERSATIONS LIST] No lead data found for conversation:', leadId);
            return;
          }

          // Get or create conversation group for this lead
          const existing = conversationMap.get(leadId);
          const isUnread = conv.direction === 'in' && !conv.read_at;
          
          if (!existing) {
            // First conversation for this lead
            conversationMap.set(leadId, {
              leadData,
              latestConversation: conv,
              unreadCount: isUnread ? 1 : 0,
              totalMessages: 1
            });
          } else {
            // Update existing group
            // Keep the latest conversation (conversations are ordered by sent_at desc)
            if (new Date(conv.sent_at) > new Date(existing.latestConversation.sent_at)) {
              existing.latestConversation = conv;
            }
            // Count unread messages
            if (isUnread) {
              existing.unreadCount++;
            }
            existing.totalMessages++;
          }
        });

        console.log('📊 [CONVERSATIONS LIST] Processed conversation groups:', conversationMap.size);

        // Step 4: Convert to ConversationListItem format
        const result: ConversationListItem[] = Array.from(conversationMap.entries()).map(([leadId, group]) => {
          const { leadData, latestConversation, unreadCount, totalMessages } = group;
          
          // Get primary phone or fallback
          const primaryPhone = leadData.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                              leadData.phone_numbers?.[0]?.number || 
                              'No phone';

          const conversationItem: ConversationListItem = {
            leadId,
            leadName: `${leadData.first_name || 'Unknown'} ${leadData.last_name || 'Lead'}`.trim(),
            primaryPhone,
            leadPhone: primaryPhone,
            leadEmail: leadData.email || '',
            lastMessage: latestConversation.body || 'No message content',
            lastMessageTime: new Date(latestConversation.sent_at).toLocaleString(),
            lastMessageDirection: latestConversation.direction as 'in' | 'out',
            lastMessageDate: new Date(latestConversation.sent_at),
            unreadCount,
            messageCount: totalMessages,
            salespersonId: leadData.salesperson_id,
            vehicleInterest: leadData.vehicle_interest || 'Not specified',
            leadSource: leadData.source || '',
            leadType: leadData.lead_type_name || 'unknown',
            status: leadData.status || 'new',
            salespersonName: leadData.profiles ? 
              `${leadData.profiles.first_name} ${leadData.profiles.last_name}`.trim() : undefined,
            aiOptIn: leadData.ai_opt_in || false
          };

          return conversationItem;
        });

        // Step 5: Sort by unread first, then by last message time
        result.sort((a, b) => {
          // Prioritize unread conversations
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          
          // Then sort by last message time (newest first)
          return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
        });

        const endTime = performance.now();
        
        console.log(`✅ [CONVERSATIONS LIST] Processing complete:`, {
          totalConversations: result.length,
          withUnread: result.filter(c => c.unreadCount > 0).length,
          totalUnreadMessages: result.reduce((sum, c) => sum + c.unreadCount, 0),
          processingTime: Math.round(endTime - startTime) + 'ms'
        });
        
        return result;

      } catch (err) {
        console.error('❌ [CONVERSATIONS LIST] Error loading conversations:', err);
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
