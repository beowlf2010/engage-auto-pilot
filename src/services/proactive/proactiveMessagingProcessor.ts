
import { supabase } from '@/integrations/supabase/client';
import { processAITakeovers } from '../aiTakeoverService';
import { sendInitialMessage } from './initialMessageService';
import type { ProactiveMessageResult } from './initialMessageService';

// Process all leads that need immediate contact
export const processProactiveMessages = async (profile: any): Promise<ProactiveMessageResult[]> => {
  try {
    console.log('🔍 Processing leads for proactive messaging...');

    // First, process any AI takeovers that are due
    await processAITakeovers();

    // Get leads that have AI enabled but no outgoing messages yet
    const { data: leadsNeedingContact } = await supabase
      .from('leads')
      .select(`
        id, 
        first_name, 
        last_name, 
        vehicle_interest,
        ai_opt_in,
        next_ai_send_at,
        ai_messages_sent
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .or('ai_messages_sent.is.null,ai_messages_sent.eq.0')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!leadsNeedingContact || leadsNeedingContact.length === 0) {
      console.log('📭 No leads need proactive contact');
      return [];
    }

    console.log(`📬 Found ${leadsNeedingContact.length} leads needing proactive contact`);

    const results: ProactiveMessageResult[] = [];

    for (const lead of leadsNeedingContact) {
      const shouldSend = !lead.next_ai_send_at || new Date(lead.next_ai_send_at) <= new Date();
      
      if (shouldSend) {
        const result = await sendInitialMessage(lead.id, profile);
        results.push(result);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error processing proactive messages:', error);
    return [];
  }
};
