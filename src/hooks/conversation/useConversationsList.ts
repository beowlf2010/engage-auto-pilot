
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem } from './conversationTypes';

export const useConversationsList = () => {
  const { profile, user, session } = useAuth();

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async () => {
      if (!profile) {
        console.log('❌ No profile found, returning empty array');
        return [];
      }

      try {
        console.log('🔄 Starting conversations query...');

        // STEP 1: Test raw conversations query without any joins
        console.log('🔍 STEP 1: Testing raw conversations count...');
        const { data: rawConversations, error: rawError } = await supabase
          .from('conversations')
          .select('id, lead_id')
          .limit(50000);
        
        console.log('🔍 STEP 1 Results:', {
          rawError,
          rawConversationsCount: rawConversations?.length || 0,
          uniqueLeadIdsFromRaw: [...new Set(rawConversations?.map(c => c.lead_id) || [])].length
        });

        // STEP 2: Test with leads join
        console.log('🔍 STEP 2: Testing with leads join...');
        const { data: conversationsData, error } = await supabase
          .from('conversations')
          .select(`
            id,
            lead_id,
            body,
            direction,
            sent_at,
            read_at,
            leads!inner(
              id,
              first_name,
              last_name,
              email,
              vehicle_interest,
              salesperson_id,
              status,
              ai_opt_in,
              source,
              lead_type_name,
              profiles(
                first_name,
                last_name
              )
            )
          `)
          .order('sent_at', { ascending: false })
          .limit(50000);

        console.log('🔍 STEP 2 Results:', {
          error,
          conversationCount: conversationsData?.length || 0,
          uniqueLeadIds: [...new Set(conversationsData?.map(conv => conv.lead_id) || [])].length,
          sampleData: conversationsData?.slice(0, 3).map(c => ({
            id: c.id,
            lead_id: c.lead_id,
            hasLeadData: !!c.leads,
            leadFirstName: c.leads?.first_name
          }))
        });

        if (error) throw error;

        // Get unique lead IDs from conversations
        const leadIds = [...new Set(conversationsData?.map(conv => conv.lead_id) || [])];
        
        // Get phone numbers for all leads in a separate query
        const { data: phoneData } = await supabase
          .from('phone_numbers')
          .select('lead_id, number, is_primary')
          .in('lead_id', leadIds);

        // Create a map of lead_id to phone numbers
        const phoneMap = new Map<string, { number: string; is_primary: boolean }[]>();
        phoneData?.forEach(phone => {
          if (!phoneMap.has(phone.lead_id)) {
            phoneMap.set(phone.lead_id, []);
          }
          phoneMap.get(phone.lead_id)!.push(phone);
        });

        // Process conversations into list format
        const conversationMap = new Map<string, ConversationListItem>();

        conversationsData?.forEach(conv => {
          const leadId = conv.lead_id;
          const lead = conv.leads;
          
          if (!conversationMap.has(leadId)) {
            // Get phone numbers for this lead from the phone map
            const leadPhones = phoneMap.get(leadId) || [];
            const primaryPhone = leadPhones.find(p => p.is_primary)?.number || 
                               leadPhones[0]?.number || '';

            conversationMap.set(leadId, {
              leadId,
              leadName: `${lead.first_name} ${lead.last_name}`,
              primaryPhone,
              leadPhone: primaryPhone,
              leadEmail: lead.email || '',
              lastMessage: conv.body,
              lastMessageTime: new Date(conv.sent_at).toLocaleString(),
              lastMessageDirection: conv.direction as 'in' | 'out',
              lastMessageDate: new Date(conv.sent_at),
              unreadCount: 0,
              messageCount: 0,
              salespersonId: lead.salesperson_id,
              vehicleInterest: lead.vehicle_interest || '',
              leadSource: lead.source || '',
              leadType: lead.lead_type_name || 'unknown',
              status: lead.status || 'new',
              salespersonName: lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : undefined,
              aiOptIn: lead.ai_opt_in || false
            });
          }

          // Count messages
          const conversation = conversationMap.get(leadId)!;
          conversation.messageCount++;

          // Count unread incoming messages
          if (conv.direction === 'in' && !conv.read_at) {
            conversation.unreadCount++;
          }
        });

        const result = Array.from(conversationMap.values());
        console.log(`✅ [STABLE CONV] Loaded ${result.length} conversations`);
        return result;

      } catch (err) {
        console.error('❌ [STABLE CONV] Error loading conversations:', err);
        throw err;
      }
    },
    enabled: !!profile,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    conversations,
    conversationsLoading,
    refetchConversations
  };
};
