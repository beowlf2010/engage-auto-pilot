
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

export const useLeads = () => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      console.log('Fetching leads with enhanced AI strategy fields...');
      
      const { data, error } = await supabase
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

      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }

      console.log('Raw leads data sample:', data?.[0]);

      // Transform the data to match Lead interface
      const transformedLeads: Lead[] = data?.map(lead => {
        // Get primary phone number
        const primaryPhone = lead.phone_numbers?.find((p: any) => p.is_primary)?.number || 
                            lead.phone_numbers?.[0]?.number || null;

        // Get all phone numbers for the lead
        const phoneNumbers = lead.phone_numbers || [];

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
          status: lead.status || 'new',
          contactStatus: lead.contact_status || 'no_contact',
          salesPersonName: [lead.salesperson_first_name, lead.salesperson_last_name].filter(Boolean).join(' ') || '',
          doNotCall: lead.do_not_call || false,
          doNotEmail: lead.do_not_email || false,
          doNotMail: lead.do_not_mail || false,
          aiOptIn: lead.ai_opt_in || false,
          aiSequencePaused: lead.ai_sequence_paused || false,
          messageIntensity: lead.message_intensity || 'gentle',
          aiMessagesSent: lead.ai_messages_sent || 0,
          aiStage: lead.ai_stage || null,
          aiStrategyBucket: lead.ai_strategy_bucket || null,
          aiAggressionLevel: lead.ai_aggression_level || 1,
          nextAiSendAt: lead.next_ai_send_at || null,
          createdAt: lead.created_at,
          updatedAt: lead.updated_at || lead.created_at,
          // Message tracking
          messageCount: 0, // This will be populated by a separate query if needed
          unreadCount: 0,
          lastMessage: null,
          lastMessageTime: null,
          lastMessageDirection: null,
          // Engagement metrics
          incomingCount: lead.incoming_count || 0,
          outgoingCount: lead.outgoing_count || 0,
          unrepliedCount: lead.unreplied_count || 0,
          // Enhanced AI strategy fields - now properly mapped from database
          leadTypeName: lead.lead_type_name || null,
          leadStatusTypeName: lead.lead_status_type_name || null,
          leadSourceName: lead.lead_source_name || null
        };

        // Log AI strategy fields for debugging
        if (lead.lead_type_name || lead.lead_status_type_name || lead.lead_source_name) {
          console.log(`Lead ${lead.id} AI Strategy:`, {
            leadTypeName: lead.lead_type_name,
            leadStatusTypeName: lead.lead_status_type_name,
            leadSourceName: lead.lead_source_name
          });
        }

        return transformedLead;
      }) || [];

      console.log(`Fetched ${transformedLeads.length} leads with AI strategy data`);
      
      return transformedLeads;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  return {
    leads,
    isLoading,
    error,
    invalidateLeads
  };
};
