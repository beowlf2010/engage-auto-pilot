
import { supabase } from '@/integrations/supabase/client';
import type { MessageData } from '@/types/conversation';
import { assignCurrentUserToLead } from './conversationsService';

export const fetchMessages = async (leadId: string): Promise<MessageData[]> => {
  try {
    const { data: messagesData, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    const transformedMessages = messagesData?.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      direction: msg.direction as 'in' | 'out',
      body: msg.body,
      sentAt: msg.sent_at,
      aiGenerated: msg.ai_generated || false,
      smsStatus: msg.sms_status || undefined,
      smsError: msg.sms_error || undefined
    })) || [];

    return transformedMessages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const sendMessage = async (
  leadId: string, 
  body: string, 
  profile: any, 
  aiGenerated = false
): Promise<void> => {
  try {
    // Get the lead info
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select(`
        salesperson_id,
        phone_numbers (
          number,
          is_primary
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // If lead is unassigned and user is trying to send a message, assign them
    if (!leadData.salesperson_id && profile) {
      const assigned = await assignCurrentUserToLead(leadId, profile.id);
      if (!assigned) {
        console.error('Failed to assign lead to current user');
        return;
      }
    }

    // First, save the message to the database
    const { data: messageData, error: dbError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        direction: 'out',
        body,
        ai_generated: aiGenerated,
        sent_at: new Date().toISOString(),
        sms_status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const primaryPhone = leadData.phone_numbers.find(p => p.is_primary)?.number || 
                        leadData.phone_numbers[0]?.number;

    if (!primaryPhone) {
      // Update message status to failed if no phone number
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: 'No phone number available'
        })
        .eq('id', messageData.id);
      
      console.error('No phone number found for lead');
      return;
    }

    // Send SMS via Twilio Edge Function
    try {
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: primaryPhone,
          body,
          conversationId: messageData.id
        }
      });

      if (smsError) throw smsError;

      if (smsResult.success) {
        // Update message with Twilio message ID and status
        await supabase
          .from('conversations')
          .update({ 
            sms_status: smsResult.status || 'sent',
            twilio_message_id: smsResult.twilioMessageId
          })
          .eq('id', messageData.id);
      } else {
        // Update message status to failed
        await supabase
          .from('conversations')
          .update({ 
            sms_status: 'failed',
            sms_error: smsResult.error
          })
          .eq('id', messageData.id);
      }
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Update message status to failed
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: smsError.message
        })
        .eq('id', messageData.id);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};
