
import { supabase } from '@/integrations/supabase/client';

export interface SendMessageParams {
  leadId: string;
  messageBody: string;
  profileId: string;
  isAIGenerated?: boolean;
}

export interface MessageResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

// Consolidated message sending service with proper error handling and phone fallback
export const consolidatedSendMessage = async (params: SendMessageParams): Promise<MessageResult> => {
  const { leadId, messageBody, profileId, isAIGenerated = false } = params;

  try {
    console.log(`📤 [CONSOLIDATED] Sending message to lead: ${leadId}`);
    console.log(`👤 [CONSOLIDATED] Profile ID: ${profileId}`);

    // Validate inputs
    if (!leadId || !messageBody.trim() || !profileId) {
      throw new Error('Lead ID, message body, and profile ID are required');
    }

    // Get lead data including current status
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single();

    if (leadError) {
      throw new Error(`Failed to fetch lead data: ${leadError.message}`);
    }

    // Get phone number for the lead with fallback logic
    console.log(`📱 [CONSOLIDATED] Looking for phone numbers for lead: ${leadId}`);
    
    // First try to get primary phone number
    let { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .maybeSingle();

    // If no primary phone found, get any phone number
    if (!phoneData && !phoneError) {
      console.log(`📱 [CONSOLIDATED] No primary phone found, trying any phone number`);
      const { data: anyPhoneData, error: anyPhoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .order('priority', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      phoneData = anyPhoneData;
      phoneError = anyPhoneError;
    }

    if (phoneError || !phoneData) {
      throw new Error('No phone number found for this lead');
    }

    console.log(`📱 [CONSOLIDATED] Using phone: ${phoneData.number}`);

    // Create conversation record
    const conversationData = {
      lead_id: leadId,
      profile_id: profileId,
      body: messageBody.trim(),
      direction: 'out' as const,
      sent_at: new Date().toISOString(),
      ai_generated: isAIGenerated,
      sms_status: 'pending' as const
    };

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (conversationError) {
      console.error('❌ [CONSOLIDATED] Conversation creation failed:', conversationError);
      throw new Error(`Failed to create conversation: ${conversationError.message}`);
    }

    console.log(`✅ [CONSOLIDATED] Created conversation: ${conversation.id}`);

    // Send SMS via edge function
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneData.number,
        body: messageBody.trim(),
        conversationId: conversation.id
      }
    });

    if (smsError || !smsResult?.success) {
      // Update conversation with error
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: smsResult?.error || smsError?.message || 'SMS sending failed'
        })
        .eq('id', conversation.id);
      
      throw new Error(smsResult?.error || smsError?.message || 'SMS sending failed');
    }

    // Update conversation with success
    await supabase
      .from('conversations')
      .update({
        sms_status: 'sent',
        twilio_message_id: smsResult.telnyxMessageId || smsResult.messageSid
      })
      .eq('id', conversation.id);

    // Update lead status to "engaged" if currently "new"
    if (leadData.status === 'new') {
      console.log(`🔄 [CONSOLIDATED] Updating lead status from "new" to "engaged"`);
      const { error: statusUpdateError } = await supabase
        .from('leads')
        .update({ status: 'engaged' })
        .eq('id', leadId);

      if (statusUpdateError) {
        console.warn('⚠️ [CONSOLIDATED] Failed to update lead status:', statusUpdateError);
        // Don't throw error for status update failure - message was sent successfully
      } else {
        console.log(`✅ [CONSOLIDATED] Lead status updated to "engaged"`);
      }
    }

    console.log(`✅ [CONSOLIDATED] Message sent successfully`);

    return {
      success: true,
      conversationId: conversation.id
    };

  } catch (error) {
    console.error('❌ [CONSOLIDATED] Send message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Helper function to validate profile data structure
export const validateProfile = (profile: any): { isValid: boolean; profileId?: string; error?: string } => {
  if (!profile) {
    return { isValid: false, error: 'Profile is required' };
  }

  let profileId: string;
  
  if (typeof profile === 'string') {
    profileId = profile;
  } else if (profile.id) {
    profileId = typeof profile.id === 'string' ? profile.id : profile.id?.value || profile.id?.toString();
  } else {
    return { isValid: false, error: 'Invalid profile structure - missing ID' };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(profileId)) {
    return { isValid: false, error: 'Invalid profile ID format' };
  }

  return { isValid: true, profileId };
};
