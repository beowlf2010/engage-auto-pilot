
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// CRITICAL: AI message content validation using the prevention system
const validateMessageContent = async (message: string, leadId?: string): Promise<{ isValid: boolean; failures: string[] }> => {
  try {
    console.log('🔍 [MESSAGE VALIDATION] Checking content:', {
      length: message?.length,
      leadId,
      preview: message?.substring(0, 50)
    });

    // Call the database validation function
    const { data, error } = await supabase.rpc('validate_ai_message_content', {
      p_message_content: message,
      p_lead_id: leadId || null
    });

    if (error) {
      console.error('❌ [MESSAGE VALIDATION] Database validation error:', error);
      // Fail safe - reject on validation error
      return { 
        isValid: false, 
        failures: [`Validation system error: ${error.message}`] 
      };
    }

    console.log('✅ [MESSAGE VALIDATION] Database validation result:', data);
    
    // Type-safe parsing of the JSON response
    const result = data as any;
    return {
      isValid: result?.valid === true,
      failures: Array.isArray(result?.failures) ? result.failures : []
    };
  } catch (error) {
    console.error('❌ [MESSAGE VALIDATION] Validation exception:', error);
    // Fail safe - reject on exception
    return { 
      isValid: false, 
      failures: [`Validation exception: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
};

export const sendMessage = async (
  leadId: string,
  messageContent: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  console.log(`📤 [FIXED MESSAGES SERVICE] === ENHANCED SERVICE START ===`);
  console.log(`📤 [FIXED MESSAGES SERVICE] Lead ID: ${leadId}`);
  console.log(`📤 [FIXED MESSAGES SERVICE] Message: ${messageContent.substring(0, 50)}...`);
  console.log(`📤 [FIXED MESSAGES SERVICE] Profile:`, {
    id: profile?.id,
    firstName: profile?.first_name,
    role: profile?.role
  });
  console.log(`📤 [FIXED MESSAGES SERVICE] AI Generated: ${isAIGenerated}`);

  if (!profile || !profile.id) {
    const error = new Error('Profile is required for sending messages');
    console.error(`❌ [FIXED MESSAGES SERVICE] ${error.message}`);
    throw error;
  }

  if (!messageContent?.trim()) {
    const error = new Error('Message content is required');
    console.error(`❌ [FIXED MESSAGES SERVICE] ${error.message}`);
    throw error;
  }

  // CRITICAL: Validate message content using the AI prevention system
  console.log(`🔍 [FIXED MESSAGES SERVICE] Validating message content...`);
  const validation = await validateMessageContent(messageContent.trim(), leadId);
  if (!validation.isValid) {
    console.error(`🚫 [FIXED MESSAGES SERVICE] Message failed validation:`, validation.failures);
    const error = new Error(`Message blocked: ${validation.failures.join('; ')}`);
    throw error;
  }
  console.log(`✅ [FIXED MESSAGES SERVICE] Message validation passed`);

  if (!leadId) {
    const error = new Error('Lead ID is required');
    console.error(`❌ [FIXED MESSAGES SERVICE] ${error.message}`);
    throw error;
  }

  try {
    // Step 1: Get the lead's primary phone number
    console.log(`📱 [FIXED MESSAGES SERVICE] Looking up phone for lead: ${leadId}`);
    
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (phoneError) {
      console.error(`❌ [FIXED MESSAGES SERVICE] Phone lookup error:`, phoneError);
      
      // Fallback: try to get any phone number for this lead
      console.log(`🔄 [FIXED MESSAGES SERVICE] Fallback: trying to get any phone number`);
      const { data: fallbackPhone, error: fallbackError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .limit(1)
        .single();

      if (fallbackError || !fallbackPhone) {
        const error = new Error('No phone number found for this lead');
        console.error(`❌ [FIXED MESSAGES SERVICE] ${error.message}`);
        throw error;
      }
      
      console.log(`✅ [FIXED MESSAGES SERVICE] Using fallback phone: ${fallbackPhone.number}`);
    }

    const phoneNumber = phoneData?.number || null;
    
    if (!phoneNumber) {
      const error = new Error('No phone number found for this lead');
      console.error(`❌ [FIXED MESSAGES SERVICE] ${error.message}`);
      throw error;
    }

    console.log(`📱 [FIXED MESSAGES SERVICE] Found phone: ${phoneNumber}`);

    // Step 2: Create conversation record first
    console.log(`💾 [FIXED MESSAGES SERVICE] Creating conversation record...`);
    
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        profile_id: profile.id,
        body: messageContent.trim(),
        direction: 'out',
        ai_generated: isAIGenerated,
        sent_at: new Date().toISOString(),
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      console.error(`❌ [FIXED MESSAGES SERVICE] Failed to create conversation:`, conversationError);
      throw new Error(`Failed to save message: ${conversationError.message}`);
    }

    console.log(`✅ [FIXED MESSAGES SERVICE] Created conversation: ${conversation.id}`);

    // Step 3: Send SMS via edge function
    console.log(`📤 [FIXED MESSAGES SERVICE] Sending SMS via edge function...`);
    
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneNumber,
        body: messageContent.trim(),
        conversationId: conversation.id,
        leadId: leadId,
        profileId: profile.id,
        isAIGenerated: isAIGenerated
      }
    });

    if (smsError) {
      console.error(`❌ [FIXED MESSAGES SERVICE] SMS send error:`, smsError);
      
      // Update conversation with error
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: smsError.message
        })
        .eq('id', conversation.id);
      
      throw new Error(`Failed to send SMS: ${smsError.message}`);
    }

    if (!smsResult?.success) {
      console.error(`❌ [FIXED MESSAGES SERVICE] SMS send failed:`, smsResult);
      
      // Update conversation with error
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: smsResult?.error || 'Unknown error'
        })
        .eq('id', conversation.id);
      
      throw new Error(`Failed to send SMS: ${smsResult?.error || 'Unknown error'}`);
    }

    console.log(`✅ [FIXED MESSAGES SERVICE] SMS sent successfully:`, smsResult);

    // Step 4: Update conversation with success
    if (smsResult.messageSid || smsResult.telnyxMessageId) {
      console.log(`📝 [FIXED MESSAGES SERVICE] Updating conversation with message ID...`);
      
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: smsResult.messageSid || smsResult.telnyxMessageId
        })
        .eq('id', conversation.id);
    }

    console.log(`✅ [FIXED MESSAGES SERVICE] === SERVICE COMPLETE ===`);
    
    return {
      success: true,
      conversationId: conversation.id,
      messageSid: smsResult.messageSid || smsResult.telnyxMessageId
    };

  } catch (error) {
    console.error(`❌ [FIXED MESSAGES SERVICE] === SERVICE FAILED ===`);
    console.error(`❌ [FIXED MESSAGES SERVICE] Error:`, error);
    
    // Show user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
    
    toast({
      title: "Message Send Failed",
      description: errorMessage,
      variant: "destructive"
    });
    
    throw error;
  }
};
