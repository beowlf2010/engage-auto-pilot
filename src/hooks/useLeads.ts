
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { LeadData, ConversationData, ProcessedLead } from './leads/types';
import { transformLeadData } from './leads/leadDataProcessor';
import { sortLeads } from './leads/leadSorter';

export const useLeads = () => {
  const [leads, setLeads] = useState<ProcessedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchLeads = async () => {
    if (!profile) return;

    setLoading(true);
    try {
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
            status,
            is_primary,
            last_attempt
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch conversation data for all leads - include read_at field
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('lead_id, body, sent_at, direction, read_at, sms_status')
        .order('sent_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Transform data to match existing component structure
      const transformedLeads = leadsData?.map(lead => 
        transformLeadData(lead as LeadData, conversationsData as ConversationData[])
      ) || [];

      // Sort leads according to business logic
      const sortedLeads = sortLeads(transformedLeads);

      setLeads(sortedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchLeads();
    }
  }, [profile]);

  return { leads, loading, refetch: fetchLeads };
};
