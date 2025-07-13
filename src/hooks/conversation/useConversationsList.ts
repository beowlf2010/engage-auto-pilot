
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

        // Get the most recent conversation per lead using direct query
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
          .order('sent_at', { ascending: false });

        if (error) throw error;

        // Group conversations by lead and get the most recent one per lead
        const conversationMap = new Map<string, any>();
        const seenLeads = new Set<string>();
        
        // Process conversations to get one per lead (most recent first due to ordering)
        conversationsData?.forEach(conv => {
          if (!seenLeads.has(conv.lead_id)) {
            seenLeads.add(conv.lead_id);
            conversationMap.set(conv.lead_id, conv);
          }
        });

        // Get unique lead IDs from the filtered conversations
        const leadIds = Array.from(conversationMap.keys());
        
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
        const conversationListMap = new Map<string, ConversationListItem>();

        Array.from(conversationMap.values()).forEach(conv => {
          const leadId = conv.lead_id;
          const lead = conv.leads;
          
          // Get phone numbers for this lead from the phone map
          const leadPhones = phoneMap.get(leadId) || [];
          const primaryPhone = leadPhones.find(p => p.is_primary)?.number || 
                             leadPhones[0]?.number || '';

          conversationListMap.set(leadId, {
            leadId,
            leadName: `${lead.first_name} ${lead.last_name}`,
            primaryPhone,
            leadPhone: primaryPhone,
            leadEmail: lead.email || '',
            lastMessage: conv.body,
            lastMessageTime: new Date(conv.sent_at).toLocaleString(),
            lastMessageDirection: conv.direction as 'in' | 'out',
            lastMessageDate: new Date(conv.sent_at),
            unreadCount: conv.direction === 'in' && !conv.read_at ? 1 : 0,
            messageCount: 1,
            salespersonId: lead.salesperson_id,
            vehicleInterest: lead.vehicle_interest || '',
            leadSource: lead.source || '',
            leadType: lead.lead_type_name || 'unknown',
            status: lead.status || 'new',
            salespersonName: lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : undefined,
            aiOptIn: lead.ai_opt_in || false
          });
        });

        const result = Array.from(conversationListMap.values());
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
