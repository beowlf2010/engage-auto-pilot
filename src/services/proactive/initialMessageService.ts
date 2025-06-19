
import { supabase } from '@/integrations/supabase/client';
import { sendMessage } from '../messagesService';
import { addAIConversationNote } from '../vehicleMention/aiConversationNotes';
import { generateWarmInitialMessage } from './warmIntroductionService';

export interface ProactiveMessageResult {
  success: boolean;
  leadId: string;
  message?: string;
  error?: string;
}

// Send immediate first message when AI is enabled - NOW USES ENHANCED AI WITH WARM INTRODUCTION
export const sendInitialMessage = async (leadId: string, profile: any): Promise<ProactiveMessageResult> => {
  try {
    console.log(`🚀 Sending warm initial proactive message to lead ${leadId} using ENHANCED AI`);

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, leadId, error: 'Lead not found' };
    }

    if (!lead.ai_opt_in) {
      return { success: false, leadId, error: 'AI not enabled for lead' };
    }

    // Check if we've already sent a message
    const { data: existingMessages } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(1);

    if (existingMessages && existingMessages.length > 0) {
      return { success: false, leadId, error: 'Already contacted this lead' };
    }

    // Generate warm initial message using ENHANCED AI with introduction context
    const message = await generateWarmInitialMessage(lead, profile);
    if (!message) {
      return { success: false, leadId, error: 'Failed to generate message' };
    }

    // Send the message
    try {
      await sendMessage(leadId, message, profile, true);
      
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

      // Add AI conversation note about initial contact
      await addAIConversationNote(
        leadId,
        messageId,
        'inventory_discussion',
        `Enhanced AI warm introduction: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        []
      );
    } catch (error) {
      console.error('Error sending message or adding note:', error);
      return { success: false, leadId, error: 'Failed to send message' };
    }

    // Update lead status
    await supabase
      .from('leads')
      .update({
        ai_messages_sent: 1,
        ai_stage: 'initial_contact_sent',
        next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', leadId);

    console.log(`✅ Enhanced AI warm introduction sent to ${lead.first_name}: ${message}`);
    
    return { success: true, leadId, message };
  } catch (error) {
    console.error(`❌ Error sending enhanced AI warm introduction to lead ${leadId}:`, error);
    return { 
      success: false, 
      leadId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
