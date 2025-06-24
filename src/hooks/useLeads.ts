
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

export const useLeads = () => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      console.log('🔍 [LEADS FETCH] Fetching leads with enhanced AI strategy fields...');
      
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
        console.error('❌ [LEADS FETCH] Error fetching leads:', error);
        throw error;
      }

      console.log(`🔍 [LEADS FETCH] Raw leads data count: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('🔍 [LEADS FETCH] Sample raw lead with AI fields:', {
          id: data[0].id,
          name: `${data[0].first_name} ${data[0].last_name}`,
          lead_type_name: data[0].lead_type_name,
          lead_status_type_name: data[0].lead_status_type_name,
          lead_source_name: data[0].lead_source_name
        });
      }

      // Transform the data to match Lead interface
      const transformedLeads: Lead[] = data?.map(lead => {
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

        // Determine contact status based on available data
        const contactStatus: 'no_contact' | 'contact_attempted' | 'response_received' = 'no_contact';

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
          // Message tracking - provide defaults since these fields may not exist in DB
          messageCount: 0,
          unreadCount: 0,
          lastMessage: null,
          lastMessageTime: null,
          lastMessageDirection: null,
          // Engagement metrics with fallbacks - these fields may not exist in the current schema
          incomingCount: 0,
          outgoingCount: 0,
          unrepliedCount: 0,
          // Enhanced AI strategy fields - properly mapped from database with logging
          leadTypeName: lead.lead_type_name || null,
          leadStatusTypeName: lead.lead_status_type_name || null,
          leadSourceName: lead.lead_source_name || null,
          // Required Lead properties for compatibility
          salespersonId: lead.salesperson_id || '',
          first_name: lead.first_name || '',
          last_name: lead.last_name || '',
          created_at: lead.created_at,
        };

        // Log AI strategy fields for debugging with enhanced detail
        if (lead.lead_type_name || lead.lead_status_type_name || lead.lead_source_name) {
          console.log(`🧠 [LEADS FETCH] Lead ${lead.id} (${lead.first_name} ${lead.last_name}) AI Strategy:`, {
            leadTypeName: lead.lead_type_name,
            leadStatusTypeName: lead.lead_status_type_name,
            leadSourceName: lead.lead_source_name,
            source: lead.source
          });
        }

        return transformedLead;
      }) || [];

      const aiFieldsCount = transformedLeads.filter(l => l.leadTypeName || l.leadStatusTypeName || l.leadSourceName).length;
      console.log(`✅ [LEADS FETCH] Transformed ${transformedLeads.length} leads, ${aiFieldsCount} with AI strategy data`);
      
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
    loading: isLoading, // Map isLoading to loading for compatibility
    isLoading,
    error,
    invalidateLeads,
    refetch
  };
};
