
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { ConversationListItem } from './conversationTypes';

export const useConversationsList = () => {
  const { profile, user, session } = useAuth();

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['stable-conversations', profile?.id],
    queryFn: async () => {
      // STEP 1: Debug current auth state
      console.log('🔍 [DEBUG STEP 1] Auth State Check:', {
        userId: user?.id,
        profileId: profile?.id,
        profileRole: profile?.role,
        userRoles: profile?.userRoles,
        sessionExists: !!session,
        sessionExpiresAt: session?.expires_at,
        isSessionValid: session ? (session.expires_at > Date.now() / 1000) : false
      });

      if (!profile) {
        console.log('❌ [DEBUG STEP 1] No profile found, returning empty array');
        return [];
      }

      try {
        console.log('🔄 [STABLE CONV] Loading conversations...');
        
        // STEP 4: Test the RLS function directly
        try {
          const { data: managerCheck, error: managerError } = await supabase.rpc('user_has_manager_access');
          console.log('🔍 [DEBUG STEP 4] Manager access check:', {
            hasManagerAccess: managerCheck,
            error: managerError
          });
        } catch (rlsError) {
          console.error('❌ [DEBUG STEP 4] Error checking manager access:', rlsError);
        }
        
        // STEP 2: Test the exact query to see what's happening
        console.log('🔍 [DEBUG STEP 2] About to execute conversations query...');

        // Get distinct conversations with lead data and aggregated phone numbers
        // Removed .limit() to fetch ALL conversations and show all conversation threads
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

        // STEP 2: Debug query results
        console.log('🔍 [DEBUG STEP 2] Raw query results:', {
          error: error,
          conversationCount: conversationsData?.length || 0,
          firstFewConversations: conversationsData?.slice(0, 3).map(c => ({
            id: c.id,
            lead_id: c.lead_id,
            salesperson_id: c.leads?.salesperson_id,
            direction: c.direction
          }))
        });

        if (error) throw error;

        // Get unique lead IDs from conversations
        const leadIds = [...new Set(conversationsData?.map(conv => conv.lead_id) || [])];
        
        console.log('🔍 [DEBUG STEP 2] Processing results:', {
          uniqueLeadIds: leadIds.length,
          totalConversationRecords: conversationsData?.length || 0
        });
        
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
