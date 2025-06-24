
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

export const useLeads = () => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      console.log('🔍 [LEADS FETCH] Fetching leads with conversation data...');
      
      // Fetch leads with phone numbers
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (
            id,
            number,
            type,
            priority,
            is_primary,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('❌ [LEADS FETCH] Error fetching leads:', leadsError);
        throw leadsError;
      }

      // Fetch all conversations to calculate message counts - INCLUDING body field
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('lead_id, direction, sent_at, read_at, body');

      if (conversationsError) {
        console.error('❌ [LEADS FETCH] Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      console.log(`🔍 [LEADS FETCH] Raw leads data count: ${leadsData?.length || 0}`);
      console.log(`📨 [LEADS FETCH] Conversations data count: ${conversationsData?.length || 0}`);

      // Transform the data to match Lead interface
      const transformedLeads: Lead[] = leadsData?.map(lead => {
        // Get primary phone number
        const primaryPhone = lead.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                            lead.phone_numbers?.[0]?.number || '';

        // Transform phone numbers to match PhoneNumber interface
        const phoneNumbers = lead.phone_numbers?.map((phone: any) => ({
          id: phone.id,
          number: phone.number,
          type: phone.type as 'cell' | 'day' | 'eve',
          priority: phone.priority,
          status: phone.status as 'active' | 'failed' | 'opted_out',
          isPrimary: phone.is_primary,
        })) || [];

        // Calculate message counts for this lead
        const leadConversations = conversationsData?.filter(conv => conv.lead_id === lead.id) || [];
        const incomingCount = leadConversations.filter(msg => msg.direction === 'in').length;
        const outgoingCount = leadConversations.filter(msg => msg.direction === 'out').length;
        const unreadCount = leadConversations.filter(msg => 
          msg.direction === 'in' && !msg.read_at
        ).length;

        // Calculate unreplied count - incoming messages that don't have an outgoing response after them
        let unrepliedCount = 0;
        const sortedConversations = leadConversations.sort((a, b) => 
          new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
        
        for (let i = 0; i < sortedConversations.length; i++) {
          const msg = sortedConversations[i];
          if (msg.direction === 'in') {
            const hasReply = sortedConversations.slice(i + 1).some(laterMsg => 
              laterMsg.direction === 'out'
            );
            if (!hasReply) {
              unrepliedCount++;
            }
          }
        }

        // Get the most recent message
        const lastMessage = leadConversations.sort((a, b) => 
          new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        )[0];

        // Determine contact status based on message data
        let contactStatus: 'no_contact' | 'contact_attempted' | 'response_received' = 'no_contact';
        if (incomingCount > 0) {
          contactStatus = 'response_received';
        } else if (outgoingCount > 0) {
          contactStatus = 'contact_attempted';
        }

        // Map status with proper type checking
        const mapStatus = (status: string): 'new' | 'engaged' | 'paused' | 'closed' | 'lost' => {
          const validStatuses = ['new', 'engaged', 'paused', 'closed', 'lost'];
          return validStatuses.includes(status) ? status as 'new' | 'engaged' | 'paused' | 'closed' | 'lost' : 'new';
        };

        // Map message intensity with proper type checking
        const mapMessageIntensity = (intensity: string): 'gentle' | 'standard' | 'aggressive' => {
          const validIntensities = ['gentle', 'standard', 'aggressive'];
          return validIntensities.includes(intensity) ? intensity as 'gentle' | 'standard' | 'aggressive' : 'gentle';
        };

        const transformedLead: Lead = {
          id: lead.id,
          firstName: lead.first_name || '',
          lastName: lead.last_name || '',
          middleName: lead.middle_name || '',
          email: lead.email || '',
          emailAlt: lead.email_alt || '',
          primaryPhone,
          phoneNumbers,
          address: lead.address || '',
          city: lead.city || '',
          state: lead.state || '',
          postalCode: lead.postal_code || '',
          vehicleInterest: lead.vehicle_interest || '',
          vehicleVIN: lead.vehicle_vin || '',
          source: lead.source || 'Unknown',
          status: mapStatus(lead.status || 'new'),
          contactStatus,
          salesperson: [lead.salesperson_first_name, lead.salesperson_last_name].filter(Boolean).join(' ') || '',
          doNotCall: lead.do_not_call || false,
          doNotEmail: lead.do_not_email || false,
          doNotMail: lead.do_not_mail || false,
          aiOptIn: lead.ai_opt_in || false,
          aiSequencePaused: lead.ai_sequence_paused || false,
          messageIntensity: mapMessageIntensity(lead.message_intensity || 'gentle'),
          aiMessagesSent: lead.ai_messages_sent || 0,
          aiStage: lead.ai_stage || null,
          aiStrategyBucket: lead.ai_strategy_bucket || null,
          aiAggressionLevel: lead.ai_aggression_level || 1,
          nextAiSendAt: lead.next_ai_send_at || null,
          createdAt: lead.created_at,
          // Enhanced message tracking with actual data
          messageCount: leadConversations.length,
          unreadCount,
          lastMessage: lastMessage?.body || null,
          lastMessageTime: lastMessage ? new Date(lastMessage.sent_at).toLocaleString() : null,
          lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null || null,
          // Accurate engagement metrics
          incomingCount,
          outgoingCount,
          unrepliedCount,
          // Enhanced AI strategy fields
          leadTypeName: lead.lead_type_name || null,
          leadStatusTypeName: lead.lead_status_type_name || null,
          leadSourceName: lead.lead_source_name || null,
          // Required Lead properties for compatibility
          salespersonId: lead.salesperson_id || '',
          first_name: lead.first_name || '',
          last_name: lead.last_name || '',
          created_at: lead.created_at,
        };

        return transformedLead;
      }) || [];

      console.log(`✅ [LEADS FETCH] Transformed ${transformedLeads.length} leads with message data`);
      
      return transformedLeads;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const refetch = () => {
    return queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  return {
    leads,
    loading: isLoading,
    isLoading,
    error,
    invalidateLeads,
    refetch
  };
};
