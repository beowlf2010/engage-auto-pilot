
import { supabase } from '@/integrations/supabase/client';
import { processAITakeovers } from '../aiTakeoverService';
import { sendInitialMessage } from './initialMessageService';
import { conversationAdvancementService } from '../conversationAdvancementService';
import type { ProactiveMessageResult } from './initialMessageService';

// Process conversation advancement for engaged leads
const processConversationAdvancements = async (profile: any) => {
  try {
    console.log('🔄 Processing conversation advancements...');
    
    // Get leads with recent incoming messages that need follow-up
    const { data: stalledLeads } = await supabase
      .from('conversations')
      .select(`
        lead_id,
        direction,
        sent_at,
        leads!inner(id, first_name, vehicle_interest, ai_opt_in)
      `)
      .eq('direction', 'in')
      .eq('leads.ai_opt_in', true)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false });

    if (!stalledLeads || stalledLeads.length === 0) {
      console.log('📭 No stalled conversations found');
      return;
    }

    // Group by lead_id and process unique leads
    const uniqueLeads = new Map();
    stalledLeads.forEach(conv => {
      if (!uniqueLeads.has(conv.lead_id)) {
        uniqueLeads.set(conv.lead_id, conv);
      }
    });

    console.log(`🎯 Found ${uniqueLeads.size} leads with stalled conversations`);

    for (const [leadId, conversation] of uniqueLeads) {
      const timeSinceLastMessage = Math.floor((Date.now() - new Date(conversation.sent_at).getTime()) / (1000 * 60 * 60));
      
      // Only advance conversations that are 2+ hours old
      if (timeSinceLastMessage >= 2) {
        console.log(`🚀 Advancing conversation for lead: ${leadId}`);
        const result = await conversationAdvancementService.advanceConversation(leadId);
        
        if (result.success && result.strategy) {
          await conversationAdvancementService.sendAdvancementMessage(leadId, result.strategy);
          console.log(`✅ Sent advancement message for lead: ${leadId}`);
          
          // Add delay to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing conversation advancements:', error);
  }
};

// Process all leads that need immediate contact
export const processProactiveMessages = async (profile: any): Promise<ProactiveMessageResult[]> => {
  try {
    console.log('🔍 Processing leads for proactive messaging...');

    // First, process any AI takeovers that are due
    await processAITakeovers();

    // Process conversation advancement for engaged leads
    await processConversationAdvancements(profile);

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
