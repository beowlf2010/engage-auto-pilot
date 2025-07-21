
import { supabase } from '@/integrations/supabase/client';
import { errorHandlingService } from './errorHandlingService';

export interface ConsolidatedMessageParams {
  leadId: string;
  messageBody: string;
  profileId: string;
  isAIGenerated?: boolean;
}

export interface ConsolidatedMessageResult {
  success: boolean;
  conversationId?: string;
  messageSid?: string;
  error?: string;
  errorDetails?: any;
  blocked?: boolean;
  compliance?: boolean;
}

export const validateProfile = (profile: any): { isValid: boolean; profileId: string | null; error?: string } => {
  if (!profile) {
    return { isValid: false, profileId: null, error: 'Profile is null or undefined' };
  }
  
  if (!profile.id) {
    return { isValid: false, profileId: null, error: 'Profile missing ID field' };
  }
  
  return { isValid: true, profileId: profile.id };
};

export const validateLead = async (leadId: string): Promise<{ isValid: boolean; lead: any; error?: string }> => {
  try {
    console.log(`🔍 [CONSOLIDATED] Validating lead: ${leadId}`);
    
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, status')
      .eq('id', leadId)
      .single();
    
    if (leadError) {
      console.error(`❌ [CONSOLIDATED] Lead lookup error:`, leadError);
      return { isValid: false, lead: null, error: `Lead lookup failed: ${leadError.message}` };
    }
    
    if (!lead) {
      console.error(`❌ [CONSOLIDATED] Lead not found: ${leadId}`);
      return { isValid: false, lead: null, error: 'Lead not found' };
    }
    
    console.log(`✅ [CONSOLIDATED] Lead validated: ${lead.first_name} ${lead.last_name}`);
    return { isValid: true, lead };
  } catch (error) {
    console.error(`❌ [CONSOLIDATED] Lead validation error:`, error);
    return { isValid: false, lead: null, error: `Lead validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// CRITICAL: AI message content validation using the prevention system
export const validateMessageContent = async (message: string, leadId?: string): Promise<{ isValid: boolean; failures: string[] }> => {
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

export const getLeadPhoneNumber = async (leadId: string): Promise<{ phoneNumber: string | null; error?: string }> => {
  try {
    console.log(`📱 [CONSOLIDATED] Looking up phone for lead: ${leadId}`);
    
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .maybeSingle();
    
    if (phoneError) {
      console.error(`❌ [CONSOLIDATED] Phone lookup error:`, phoneError);
      
      // Try fallback: get any phone number for this lead
      console.log(`🔄 [CONSOLIDATED] Trying fallback phone lookup`);
      const { data: fallbackPhone, error: fallbackError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .limit(1)
        .maybeSingle();
      
      if (fallbackError || !fallbackPhone) {
        console.error(`❌ [CONSOLIDATED] Fallback phone lookup failed:`, fallbackError);
        return { phoneNumber: null, error: 'No phone number found for this lead' };
      }
      
      console.log(`✅ [CONSOLIDATED] Using fallback phone: ${fallbackPhone.number}`);
      return { phoneNumber: fallbackPhone.number };
    }
    
    if (!phoneData || !phoneData.number) {
      console.error(`❌ [CONSOLIDATED] No phone number found for lead: ${leadId}`);
      return { phoneNumber: null, error: 'No phone number found for this lead' };
    }
    
    console.log(`✅ [CONSOLIDATED] Found phone: ${phoneData.number}`);
    return { phoneNumber: phoneData.number };
  } catch (error) {
    console.error(`❌ [CONSOLIDATED] Phone lookup exception:`, error);
    return { phoneNumber: null, error: `Phone lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export const consolidatedSendMessage = async (params: ConsolidatedMessageParams): Promise<ConsolidatedMessageResult> => {
  const { leadId, messageBody, profileId, isAIGenerated = false } = params;
  
  console.log(`📤 [CONSOLIDATED] === ENHANCED SEND MESSAGE START ===`);
  console.log(`📤 [CONSOLIDATED] Lead ID: ${leadId}`);
  console.log(`📤 [CONSOLIDATED] Profile ID: ${profileId}`);
  console.log(`📤 [CONSOLIDATED] Message length: ${messageBody?.length || 0}`);
  console.log(`📤 [CONSOLIDATED] AI Generated: ${isAIGenerated}`);
  console.log(`📤 [CONSOLIDATED] Message preview: ${messageBody?.substring(0, 100)}...`);

  try {
    // Step 1: Validate inputs
    if (!leadId) {
      const error = 'Lead ID is required';
      console.error(`❌ [CONSOLIDATED] ${error}`);
      return { success: false, error };
    }
    
    if (!messageBody?.trim()) {
      const error = 'Message body is required and cannot be empty';
      console.error(`❌ [CONSOLIDATED] ${error}`);
      return { success: false, error };
    }

    // CRITICAL: Validate message content using the AI prevention system
    console.log(`🔍 [CONSOLIDATED] Validating message content...`);
    const validation = await validateMessageContent(messageBody.trim(), leadId);
    if (!validation.isValid) {
      console.error(`🚫 [CONSOLIDATED] Message failed validation:`, validation.failures);
      return { 
        success: false, 
        error: `Message blocked: ${validation.failures.join('; ')}`,
        blocked: true,
        compliance: true
      };
    }
    console.log(`✅ [CONSOLIDATED] Message validation passed`);
    
    if (!profileId) {
      const error = 'Profile ID is required';
      console.error(`❌ [CONSOLIDATED] ${error}`);
      return { success: false, error };
    }

    // Step 2: Validate lead exists
    const leadValidation = await validateLead(leadId);
    if (!leadValidation.isValid) {
      console.error(`❌ [CONSOLIDATED] Lead validation failed: ${leadValidation.error}`);
      errorHandlingService.handleError(new Error(leadValidation.error!), {
        operation: 'consolidated_send_message_lead_validation',
        leadId,
        additionalData: { profileId, messageLength: messageBody.length }
      });
      return { success: false, error: leadValidation.error };
    }

    // Step 3: Get phone number
    const phoneResult = await getLeadPhoneNumber(leadId);
    if (!phoneResult.phoneNumber) {
      console.error(`❌ [CONSOLIDATED] Phone lookup failed: ${phoneResult.error}`);
      errorHandlingService.handleError(new Error(phoneResult.error!), {
        operation: 'consolidated_send_message_phone_lookup',
        leadId,
        additionalData: { profileId, leadName: `${leadValidation.lead.first_name} ${leadValidation.lead.last_name}` }
      });
      return { success: false, error: phoneResult.error };
    }

    // Step 4: Create conversation record
    console.log(`💾 [CONSOLIDATED] Creating conversation record...`);
    
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        profile_id: profileId,
        body: messageBody.trim(),
        direction: 'out',
        ai_generated: isAIGenerated,
        sent_at: new Date().toISOString(),
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      console.error(`❌ [CONSOLIDATED] Conversation creation failed:`, conversationError);
      errorHandlingService.handleError(conversationError, {
        operation: 'consolidated_send_message_conversation_creation',
        leadId,
        additionalData: { profileId, phoneNumber: phoneResult.phoneNumber, messageLength: messageBody.length }
      });
      return { success: false, error: `Failed to create conversation record: ${conversationError.message}`, errorDetails: conversationError };
    }

    console.log(`✅ [CONSOLIDATED] Created conversation: ${conversation.id}`);

    // Step 5: Send SMS via edge function with enhanced payload
    console.log(`📤 [CONSOLIDATED] Sending SMS via edge function...`);
    
    const smsPayload = {
      to: phoneResult.phoneNumber,
      message: messageBody.trim(),
      conversationId: conversation.id,
      leadId: leadId,
      profileId: profileId,
      isAIGenerated: isAIGenerated
    };

    console.log(`📤 [CONSOLIDATED] SMS payload details:`, {
      to: smsPayload.to,
      messageLength: smsPayload.message.length,
      conversationId: smsPayload.conversationId,
      leadId: smsPayload.leadId,
      profileId: smsPayload.profileId,
      isAIGenerated: smsPayload.isAIGenerated
    });

    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: smsPayload
    });

    console.log(`📤 [CONSOLIDATED] SMS function response:`, {
      success: smsResult?.success,
      error: smsError?.message || smsResult?.error,
      messageSid: smsResult?.messageSid || smsResult?.telnyxMessageId,
      blocked: smsResult?.blocked,
      compliance: smsResult?.compliance,
      emergency: smsResult?.emergency
    });

    if (smsError) {
      console.error(`❌ [CONSOLIDATED] SMS function error:`, smsError);
      
      // Update conversation with error
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: smsError.message
        })
        .eq('id', conversation.id);
      
      errorHandlingService.handleError(smsError, {
        operation: 'consolidated_send_message_sms_function_error',
        leadId,
        additionalData: { 
          conversationId: conversation.id, 
          phoneNumber: phoneResult.phoneNumber,
          profileId,
          errorType: 'function_error'
        }
      });
      
      return { 
        success: false, 
        error: `SMS function error: ${smsError.message}`, 
        errorDetails: smsError,
        conversationId: conversation.id 
      };
    }

    if (!smsResult?.success) {
      console.error(`❌ [CONSOLIDATED] SMS send failed:`, smsResult);
      
      // Update conversation with error
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: smsResult?.error || 'SMS sending failed'
        })
        .eq('id', conversation.id);
      
      // Handle specific failure types
      if (smsResult?.blocked) {
        console.error(`🚫 [CONSOLIDATED] Message blocked due to compliance: ${smsResult.reason || 'Unknown reason'}`);
        return {
          success: false,
          error: `Message blocked: ${smsResult.reason || 'Compliance violation'}`,
          errorDetails: smsResult,
          blocked: true,
          compliance: smsResult?.compliance,
          conversationId: conversation.id
        };
      }

      if (smsResult?.emergency) {
        console.error(`🚨 [CONSOLIDATED] Emergency shutdown active`);
        return {
          success: false,
          error: 'AI messaging system is currently disabled',
          errorDetails: smsResult,
          blocked: true,
          conversationId: conversation.id
        };
      }
      
      errorHandlingService.handleError(new Error(smsResult?.error || 'SMS sending failed'), {
        operation: 'consolidated_send_message_sms_send_failed',
        leadId,
        additionalData: { 
          conversationId: conversation.id, 
          phoneNumber: phoneResult.phoneNumber,
          profileId,
          smsResult,
          errorType: 'send_failure'
        }
      });
      
      return { 
        success: false, 
        error: smsResult?.error || 'Failed to send SMS', 
        errorDetails: smsResult,
        conversationId: conversation.id 
      };
    }

    // Step 6: Update conversation with success
    console.log(`✅ [CONSOLIDATED] SMS sent successfully, updating conversation...`);
    
    if (smsResult.messageSid || smsResult.telnyxMessageId) {
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: smsResult.messageSid || smsResult.telnyxMessageId
        })
        .eq('id', conversation.id);
    }

    console.log(`✅ [CONSOLIDATED] === SEND MESSAGE COMPLETE ===`);
    
    return {
      success: true,
      conversationId: conversation.id,
      messageSid: smsResult.messageSid || smsResult.telnyxMessageId
    };

  } catch (error) {
    console.error(`❌ [CONSOLIDATED] === SEND MESSAGE FAILED ===`);
    console.error(`❌ [CONSOLIDATED] Unexpected error:`, error);
    
    errorHandlingService.handleError(error, {
      operation: 'consolidated_send_message_unexpected_error',
      leadId,
      additionalData: { 
        profileId, 
        messageLength: messageBody?.length || 0,
        errorType: 'unexpected_exception'
      }
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred';
    return { 
      success: false, 
      error: errorMessage, 
      errorDetails: error 
    };
  }
};
