
import { supabase } from '@/integrations/supabase/client';

export const sendMessage = async (
  leadId: string,
  message: string,
  profile: any,
  isAI: boolean = false
): Promise<void> => {
  try {
    // Get lead's phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (phoneError || !phoneData) {
      throw new Error('No phone number found for lead');
    }

    // Save message to conversations first
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        body: message,
        direction: 'out',
        ai_generated: isAI,
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      throw new Error(`Failed to save conversation: ${conversationError.message}`);
    }

    // If this is a human message, clear pending human response status
    if (!isAI) {
      await supabase
        .from('leads')
        .update({
          pending_human_response: false,
          human_response_deadline: null,
          ai_sequence_paused: true,
          ai_pause_reason: 'human_responded',
          ai_resume_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Resume in 24 hours
        })
        .eq('id', leadId);
    }

    // Send SMS via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneData.number,
        body: message,
        conversationId: conversationData.id
      }
    });

    if (error) {
      // Update message status to failed
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: error.message
        })
        .eq('id', conversationData.id);
      
      throw new Error(`Failed to send SMS: ${error.message}`);
    }

    // Update message with Twilio details
    if (data.messageSid) {
      await supabase
        .from('conversations')
        .update({
          twilio_message_id: data.messageSid,
          sms_status: data.status || 'sent'
        })
        .eq('id', conversationData.id);
    }

    console.log('Message sent successfully:', {
      conversationId: conversationData.id,
      messageSid: data.messageSid,
      isAI
    });

  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
