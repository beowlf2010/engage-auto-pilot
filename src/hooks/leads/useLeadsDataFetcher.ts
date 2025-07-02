
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

  return leadsData as LeadDataFromDB[];
};

export const fetchConversationsData = async (): Promise<ConversationFromDB[]> => {
  const { data: conversationCounts, error: countError } = await supabase
    .from('conversations')
    .select('lead_id, direction, read_at, body, sent_at')
    .order('sent_at', { ascending: false });

  if (countError) throw countError;

  return conversationCounts as ConversationFromDB[];
};
