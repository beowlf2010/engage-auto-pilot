
import { supabase } from '@/integrations/supabase/client';
import { LeadDataFromDB, ConversationFromDB } from './useLeadsTypes';

export const fetchLeadsData = async (showHidden: boolean) => {
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
  
  // FILTER OUT INACTIVE LEADS BY DEFAULT (unless explicitly showing them)
  // This ensures main leads views only show workable leads
  query = query.not('status', 'in', '(lost)');

  const { data: leadsData, error: leadsError } = await query;

  if (leadsError) throw leadsError;

  // Filter out leads without valid phone numbers after fetching
  const validLeads = leadsData?.filter(lead => {
    const validPhones = lead.phone_numbers?.filter(phone => {
      const cleanNumber = phone.number?.replace(/[^0-9]/g, '') || '';
      return (
        phone.status === 'active' &&
        cleanNumber.length >= 10 &&
        cleanNumber.length <= 15 &&
        !/[a-zA-Z]/.test(phone.number || '') &&
        !phone.number?.toLowerCase().includes('commission') &&
        !phone.number?.toLowerCase().includes('tribal') &&
        !phone.number?.toLowerCase().includes('gaming') &&
        !phone.number?.toLowerCase().includes('casino')
      );
    });
    return validPhones && validPhones.length > 0;
  }) || [];

  return validLeads as LeadDataFromDB[];
};

export const fetchConversationsData = async (): Promise<ConversationFromDB[]> => {
  const { data: conversationCounts, error: countError } = await supabase
    .from('conversations')
    .select('lead_id, direction, read_at, body, sent_at')
    .order('sent_at', { ascending: false });

  if (countError) throw countError;

  return conversationCounts as ConversationFromDB[];
};
