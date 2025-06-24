import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { useToast } from '@/hooks/use-toast';

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the query based on whether to show hidden leads
      let query = supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (
            id,
            number,
            type,
            priority,
            status,
            is_primary
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter out hidden leads if showHidden is false
      if (!showHidden) {
        query = query.or('is_hidden.is.null,is_hidden.eq.false');
      }

      const { data: leadsData, error: leadsError } = await query;

      if (leadsError) throw leadsError;

      // Get conversation counts for each lead
      const { data: conversationCounts, error: countError } = await supabase
        .from('conversations')
        .select('lead_id, direction, read_at, body, sent_at')
        .order('sent_at', { ascending: false });

      if (countError) throw countError;

      // Process the data to create Lead objects
      const processedLeads: Lead[] = leadsData?.map(leadData => {
        const leadConversations = conversationCounts?.filter(conv => conv.lead_id === leadData.id) || [];
        
        const incomingCount = leadConversations.filter(conv => conv.direction === 'in').length;
        const outgoingCount = leadConversations.filter(conv => conv.direction === 'out').length;
        const unrepliedCount = leadConversations.filter(conv => 
          conv.direction === 'in' && !conv.read_at
        ).length;

        const lastMessage = leadConversations[0];
        const primaryPhone = leadData.phone_numbers?.find(p => p.is_primary)?.number || 
                           leadData.phone_numbers?.[0]?.number || '';

        return {
          id: leadData.id,
          firstName: leadData.first_name || '',
          lastName: leadData.last_name || '',
          middleName: leadData.middle_name,
          phoneNumbers: leadData.phone_numbers?.map(p => ({
            id: p.id,
            number: p.number,
            type: (p.type as 'cell' | 'day' | 'eve') || 'cell',
            priority: p.priority,
            status: (p.status as 'active' | 'failed' | 'opted_out') || 'active',
            isPrimary: p.is_primary
          })) || [],
          primaryPhone,
          email: leadData.email || '',
          emailAlt: leadData.email_alt,
          address: leadData.address,
          city: leadData.city,
          state: leadData.state,
          postalCode: leadData.postal_code,
          vehicleInterest: leadData.vehicle_interest || '',
          source: leadData.source || '',
          status: (leadData.status as 'new' | 'engaged' | 'paused' | 'closed' | 'lost') || 'new',
          salesperson: leadData.profiles ? 
            `${leadData.profiles.first_name} ${leadData.profiles.last_name}`.trim() : '',
          salespersonId: leadData.salesperson_id || '',
          aiOptIn: leadData.ai_opt_in || false,
          aiStage: leadData.ai_stage,
          nextAiSendAt: leadData.next_ai_send_at,
          createdAt: leadData.created_at,
          lastMessage: lastMessage?.body,
          lastMessageTime: lastMessage?.sent_at,
          lastMessageDirection: lastMessage?.direction as 'in' | 'out' | null,
          unreadCount: unrepliedCount,
          doNotCall: leadData.do_not_call || false,
          doNotEmail: leadData.do_not_email || false,
          doNotMail: leadData.do_not_mail || false,
          vehicleYear: leadData.vehicle_year,
          vehicleMake: leadData.vehicle_make,
          vehicleModel: leadData.vehicle_model,
          vehicleVIN: leadData.vehicle_vin,
          contactStatus: 'no_contact' as 'no_contact' | 'contact_attempted' | 'response_received',
          incomingCount,
          outgoingCount,
          unrepliedCount,
          messageCount: incomingCount + outgoingCount,
          aiMessagesSent: leadData.ai_messages_sent || 0,
          aiLastMessageStage: leadData.ai_last_message_stage,
          aiSequencePaused: leadData.ai_sequence_paused || false,
          aiPauseReason: leadData.ai_pause_reason,
          aiResumeAt: leadData.ai_resume_at,
          leadStatusTypeName: leadData.lead_status_type_name,
          leadTypeName: leadData.lead_type_name,
          leadSourceName: leadData.lead_source_name,
          messageIntensity: leadData.message_intensity,
          aiStrategyBucket: leadData.ai_strategy_bucket,
          aiAggressionLevel: leadData.ai_aggression_level,
          aiStrategyLastUpdated: leadData.ai_strategy_last_updated,
          first_name: leadData.first_name || '',
          last_name: leadData.last_name || '',
          created_at: leadData.created_at,
          is_hidden: leadData.is_hidden || false
        };
      }) || [];

      setLeads(processedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  }, [showHidden]);

  const toggleLeadHidden = (leadId: string, hidden: boolean) => {
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, is_hidden: hidden } : lead
      )
    );
  };

  const updateAiOptIn = async (leadId: string, aiOptIn: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_opt_in: aiOptIn })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, aiOptIn } : lead
        )
      );

      toast({
        title: "Success",
        description: `AI messaging ${aiOptIn ? 'enabled' : 'disabled'} for lead`,
      });
    } catch (error) {
      console.error('Error updating AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    }
  };

  const updateDoNotContact = async (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    try {
      const dbField = field === 'doNotCall' ? 'do_not_call' : 
                     field === 'doNotEmail' ? 'do_not_email' : 'do_not_mail';
      
      const { error } = await supabase
        .from('leads')
        .update({ [dbField]: value })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, [field]: value } : lead
        )
      );

      toast({
        title: "Success",
        description: `Do not ${field.replace('doNot', '').toLowerCase()} ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating do not contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact preferences",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Calculate hidden count
  const hiddenCount = leads.filter(lead => lead.is_hidden).length;

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    updateAiOptIn,
    updateDoNotContact,
    showHidden,
    setShowHidden,
    hiddenCount,
    toggleLeadHidden
  };
};
