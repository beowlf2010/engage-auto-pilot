import { supabase } from '@/integrations/supabase/client';

export const getMessages = async (leadId: string) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

export const sendMessage = async (
  leadId: string,
  messageBody: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  try {
    console.log(`📤 [MESSAGES SERVICE] Sending message to lead ${leadId}`);
    console.log(`📝 [MESSAGES SERVICE] Message: "${messageBody.substring(0, 50)}..."`);
    console.log(`🤖 [MESSAGES SERVICE] AI Generated: ${isAIGenerated}`);
    console.log(`👤 [MESSAGES SERVICE] Profile:`, {
      id: profile?.id,
      firstName: profile?.first_name
    });

    // Get lead data including phone number
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        phone_numbers (
          phone_number,
          is_primary
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ [MESSAGES SERVICE] Lead not found:', leadError);
      throw new Error('Lead not found');
    }

    // Get primary phone number
    const phoneNumbers = Array.isArray(lead.phone_numbers) ? lead.phone_numbers : [];
    const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.phone_number || 
                        phoneNumbers[0]?.phone_number;

    if (!primaryPhone) {
      console.error('❌ [MESSAGES SERVICE] No phone number found for lead');
      throw new Error('No phone number found for lead');
    }

    console.log(`📱 [MESSAGES SERVICE] Sending to phone: ${primaryPhone}`);

    // Create conversation record first
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        profile_id: profile?.id,
        body: messageBody,
        direction: 'out',
        sent_at: new Date().toISOString(),
        ai_generated: isAIGenerated
      })
      .select()
      .single();

    if (conversationError) {
      console.error('❌ [MESSAGES SERVICE] Error creating conversation:', conversationError);
      throw conversationError;
    }

    console.log(`✅ [MESSAGES SERVICE] Created conversation record:`, conversation.id);

    // Send SMS via edge function
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: primaryPhone,
        body: messageBody,
        conversationId: conversation.id
      }
    });

    if (smsError) {
      console.error('❌ [MESSAGES SERVICE] SMS sending failed:', smsError);
      // Update conversation with error status
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          error_message: smsError.message 
        })
        .eq('id', conversation.id);
      throw smsError;
    }

    console.log(`✅ [MESSAGES SERVICE] SMS sent successfully:`, smsResult);

    // Update conversation with SMS details
    await supabase
      .from('conversations')
      .update({
        sms_sid: smsResult.sid,
        sms_status: 'sent'
      })
      .eq('id', conversation.id);

    console.log(`✅ [MESSAGES SERVICE] Message sent successfully to ${lead.first_name}`);

    return conversation;
  } catch (error) {
    console.error('❌ [MESSAGES SERVICE] Error in sendMessage:', error);
    throw error;
  }
};

export const updateMessageStatus = async (conversationId: string, status: string, errorMessage: string | null = null) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        sms_status: status,
        error_message: errorMessage,
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating message status:', error);
    }
  } catch (error) {
    console.error('Error updating message status:', error);
  }
};

export const markMessageAsRead = async (conversationId: string) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        is_read: true,
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error marking message as read:', error);
    }
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};
