
import { supabase } from '@/integrations/supabase/client';
import { sendMessage } from '../messagesService';
import { addAIConversationNote } from '../vehicleMention/aiConversationNotes';
import { generateWarmInitialMessage } from './warmIntroductionService';

export interface ProactiveMessageResult {
  success: boolean;
  leadId: string;
  message?: string;
  error?: string;
  messageSource?: string;
}

// Send immediate first message when AI is enabled - NOW USES ENHANCED AI WITH WARM INTRODUCTION
export const sendInitialMessage = async (leadId: string, profile: any): Promise<ProactiveMessageResult> => {
  try {
    console.log(`🚀 [INITIAL MESSAGE SERVICE] Starting warm initial proactive message to lead ${leadId}`);
    console.log(`👤 [INITIAL MESSAGE SERVICE] Profile data:`, { 
      profileId: profile?.id, 
      firstName: profile?.first_name,
      hasProfile: !!profile 
    });

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error(`❌ [INITIAL MESSAGE SERVICE] Lead not found:`, leadError);
      return { success: false, leadId, error: 'Lead not found', messageSource: 'initial_message_service' };
    }

    console.log(`📋 [INITIAL MESSAGE SERVICE] Lead data:`, {
      leadId: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      vehicleInterest: lead.vehicle_interest,
      aiOptIn: lead.ai_opt_in
    });

    if (!lead.ai_opt_in) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] AI not enabled for lead ${leadId}`);
      return { success: false, leadId, error: 'AI not enabled for lead', messageSource: 'initial_message_service' };
    }

    // Check if we've already sent a message
    const { data: existingMessages } = await supabase
      .from('conversations')
      .select('id, body, ai_generated')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(3);

    if (existingMessages && existingMessages.length > 0) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] Already contacted this lead. Existing messages:`, 
        existingMessages.map(msg => ({ id: msg.id, body: msg.body?.substring(0, 50), aiGenerated: msg.ai_generated }))
      );
      return { success: false, leadId, error: 'Already contacted this lead', messageSource: 'initial_message_service' };
    }

    // Generate warm initial message using ENHANCED AI with introduction context
    console.log(`🤖 [INITIAL MESSAGE SERVICE] Generating warm initial message...`);
    const message = await generateWarmInitialMessage(lead, profile);
    
    if (!message) {
      console.error(`❌ [INITIAL MESSAGE SERVICE] Failed to generate warm initial message`);
      return { success: false, leadId, error: 'Failed to generate message', messageSource: 'initial_message_service' };
    }

    console.log(`✨ [INITIAL MESSAGE SERVICE] Generated warm message: "${message}"`);

    // Send the message
    try {
      console.log(`📤 [INITIAL MESSAGE SERVICE] Sending message via messagesService...`);
      await sendMessage(leadId, message, profile, true);
      console.log(`✅ [INITIAL MESSAGE SERVICE] Message sent successfully`);
      
      // Get the most recent conversation for this lead to get the message ID
      const { data: recentMessage } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('direction', 'out')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const messageId = recentMessage?.id || null;
      console.log(`📝 [INITIAL MESSAGE SERVICE] Recent message ID: ${messageId}`);

      // Add AI conversation note about initial contact
      await addAIConversationNote(
        leadId,
        messageId,
        'inventory_discussion',
        `Enhanced AI warm introduction: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        []
      );
      console.log(`📋 [INITIAL MESSAGE SERVICE] Added conversation note`);
    } catch (error) {
      console.error('❌ [INITIAL MESSAGE SERVICE] Error sending message or adding note:', error);
      return { success: false, leadId, error: 'Failed to send message', messageSource: 'initial_message_service' };
    }

    // Update lead status
    console.log(`🔄 [INITIAL MESSAGE SERVICE] Updating lead status...`);
    await supabase
      .from('leads')
      .update({
        ai_messages_sent: 1,
        ai_stage: 'initial_contact_sent',
        next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', leadId);

    console.log(`✅ [INITIAL MESSAGE SERVICE] Successfully sent warm introduction to ${lead.first_name}: ${message}`);
    
    return { success: true, leadId, message, messageSource: 'initial_message_service' };
  } catch (error) {
    console.error(`❌ [INITIAL MESSAGE SERVICE] Error sending warm introduction to lead ${leadId}:`, error);
    return { 
      success: false, 
      leadId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      messageSource: 'initial_message_service'
    };
  }
};
