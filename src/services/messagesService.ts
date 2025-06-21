
import { supabase } from '@/integrations/supabase/client';
import { handleAIMessageSent } from './leadStatusTransitionService';

export const sendMessage = async (
  leadId: string,
  messageContent: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  try {
    console.log(`📤 [MESSAGES] Sending message to lead ${leadId}`);

    // Get lead's primary phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (phoneError || !phoneData) {
      throw new Error('No primary phone number found for lead');
    }

    // Send SMS via Twilio edge function
    const { data: twilioResult, error: twilioError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneData.number,
        body: messageContent,
        leadId: leadId
      }
    });

    if (twilioError || !twilioResult?.success) {
      throw new Error(`SMS failed: ${twilioError?.message || twilioResult?.error}`);
    }

    // Save conversation record
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        profile_id: profile.id,
        direction: 'out',
        body: messageContent,
        ai_generated: isAIGenerated,
        sms_status: 'sent',
        twilio_message_id: twilioResult.messageSid,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (conversationError) {
      console.error('❌ [MESSAGES] Error saving conversation:', conversationError);
      throw conversationError;
    }

    // Update lead's AI message count if this was AI generated
    if (isAIGenerated) {
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          ai_messages_sent: supabase.rpc('increment', { x: 1 })
        })
        .eq('id', leadId);

      if (leadUpdateError) {
        console.error('❌ [MESSAGES] Error updating AI message count:', leadUpdateError);
      }

      // Handle status transition for AI messages
      await handleAIMessageSent(leadId);
    }

    console.log(`✅ [MESSAGES] Message sent successfully to lead ${leadId}`);
    return conversation;

  } catch (error) {
    console.error('❌ [MESSAGES] Error sending message:', error);
    throw error;
  }
};
