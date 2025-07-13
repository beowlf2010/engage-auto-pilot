
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

        // Get conversations using prioritized function that shows inbound messages first
        const { data: conversationsData, error } = await supabase.rpc('get_inbox_conversations_prioritized');

        if (error) throw error;

        // Get unique lead IDs
        const leadIds = conversationsData?.map(conv => conv.lead_id) || [];
        
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

        conversationsData?.forEach(conv => {
          const leadId = conv.lead_id;
          
          // Get phone numbers for this lead from the phone map
          const leadPhones = phoneMap.get(leadId) || [];
          const primaryPhone = leadPhones.find(p => p.is_primary)?.number || 
                             leadPhones[0]?.number || '';

          conversationListMap.set(leadId, {
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
