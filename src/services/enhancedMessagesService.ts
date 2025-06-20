
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SendMessageParams {
  leadId: string;
  messageBody: string;
  profile: any;
  isAIGenerated?: boolean;
}

interface MessageResult {
  success: boolean;
  conversationId?: string;
  error?: string;
  debugInfo?: any;
}

// Enhanced debug logging function
const debugLog = (level: 'info' | 'warn' | 'error', action: string, data: any, error?: string) => {
  console.log(`[ENHANCED MESSAGES ${level.toUpperCase()}] ${action}:`, data);
  
  // Use global debug function if available (from debug panel)
  if ((window as any).debugLog) {
    (window as any).debugLog(level, 'Enhanced Messages Service', action, data, error);
  }
};

// Enhanced profile validation with detailed logging
const validateAndCleanProfile = (profile: any): { isValid: boolean; cleanedProfile?: any; error?: string } => {
  debugLog('info', 'Profile Validation Started', { originalProfile: profile });

  if (!profile) {
    const error = 'Profile is null or undefined';
    debugLog('error', 'Profile Validation Failed', { reason: error });
    return { isValid: false, error };
  }

  // Handle different profile data structures
  let cleanProfileId: string;
  let cleanFirstName: string;
  let cleanLastName: string;
  let cleanEmail: string;

  try {
    if (typeof profile === 'string') {
      cleanProfileId = profile;
      cleanFirstName = 'User';
      cleanLastName = '';
      cleanEmail = '';
    } else if (profile.id) {
      // Handle nested value objects (common issue)
      cleanProfileId = typeof profile.id === 'string' ? profile.id : 
                      profile.id?.value || profile.id?.toString();
      cleanFirstName = typeof profile.first_name === 'string' ? profile.first_name :
                      typeof profile.firstName === 'string' ? profile.firstName :
                      profile.first_name?.value || profile.firstName?.value || 'User';
      cleanLastName = typeof profile.last_name === 'string' ? profile.last_name :
                     typeof profile.lastName === 'string' ? profile.lastName :
                     profile.last_name?.value || profile.lastName?.value || '';
      cleanEmail = typeof profile.email === 'string' ? profile.email :
                  profile.email?.value || '';
    } else {
      const error = 'Profile missing ID field';
      debugLog('error', 'Profile Validation Failed', { reason: error, profileKeys: Object.keys(profile) });
      return { isValid: false, error };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanProfileId)) {
      const error = `Invalid profile ID format: ${cleanProfileId}`;
      debugLog('error', 'Profile Validation Failed', { reason: error, profileId: cleanProfileId });
      return { isValid: false, error };
    }

    const cleanedProfile = {
      id: cleanProfileId,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      email: cleanEmail
    };

    debugLog('info', 'Profile Validation Success', { cleanedProfile });
    return { isValid: true, cleanedProfile };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
    debugLog('error', 'Profile Validation Exception', { error: errorMsg, profileStructure: typeof profile });
    return { isValid: false, error: errorMsg };
  }
};

// Enhanced lead validation with phone number checking
const validateLead = async (leadId: string): Promise<{ isValid: boolean; leadData?: any; error?: string }> => {
  debugLog('info', 'Lead Validation Started', { leadId });

  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        status,
        phone_numbers (
          number,
          is_primary
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError) {
      debugLog('error', 'Lead Database Query Failed', { leadId, error: leadError.message });
      return { isValid: false, error: `Database error: ${leadError.message}` };
    }

    if (!lead) {
      debugLog('error', 'Lead Not Found', { leadId });
      return { isValid: false, error: 'Lead not found in database' };
    }

    const phoneNumbers = Array.isArray(lead.phone_numbers) ? lead.phone_numbers : [];
    const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.number;
    const anyPhone = phoneNumbers[0]?.number;

    if (!primaryPhone && !anyPhone) {
      debugLog('error', 'No Phone Numbers Found', { leadId, phoneCount: phoneNumbers.length });
      return { isValid: false, error: 'No phone numbers found for this lead' };
    }

    const leadData = {
      ...lead,
      selectedPhone: primaryPhone || anyPhone,
      phoneCount: phoneNumbers.length
    };

    debugLog('info', 'Lead Validation Success', { leadData });
    return { isValid: true, leadData };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown lead validation error';
    debugLog('error', 'Lead Validation Exception', { leadId, error: errorMsg });
    return { isValid: false, error: errorMsg };
  }
};

// Enhanced message sending with comprehensive error handling
export const sendEnhancedMessage = async (params: SendMessageParams): Promise<MessageResult> => {
  const { leadId, messageBody, profile, isAIGenerated = false } = params;
  
  debugLog('info', 'Message Send Started', {
    leadId,
    messageLength: messageBody.length,
    messagePreview: messageBody.substring(0, 50) + '...',
    isAIGenerated,
    profileProvided: !!profile
  });

  try {
    // Step 1: Validate and clean profile
    const profileValidation = validateAndCleanProfile(profile);
    if (!profileValidation.isValid) {
      const error = `Profile validation failed: ${profileValidation.error}`;
      debugLog('error', 'Send Message Failed - Profile', { error });
      
      toast({
        title: "Profile Error",
        description: profileValidation.error,
        variant: "destructive",
      });
      
      return { success: false, error, debugInfo: { step: 'profile_validation', profileValidation } };
    }

    // Step 2: Validate lead and get phone number
    const leadValidation = await validateLead(leadId);
    if (!leadValidation.isValid) {
      const error = `Lead validation failed: ${leadValidation.error}`;
      debugLog('error', 'Send Message Failed - Lead', { error });
      
      toast({
        title: "Lead Error",
        description: leadValidation.error,
        variant: "destructive",
      });
      
      return { success: false, error, debugInfo: { step: 'lead_validation', leadValidation } };
    }

    // Step 3: Create conversation record
    debugLog('info', 'Creating Conversation Record', {
      leadId,
      profileId: profileValidation.cleanedProfile!.id,
      messageLength: messageBody.trim().length
    });

    const conversationData = {
      lead_id: leadId,
      profile_id: profileValidation.cleanedProfile!.id,
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
      debugLog('error', 'Conversation Creation Failed', { 
        error: conversationError.message,
        conversationData 
      });
      
      toast({
        title: "Database Error",
        description: "Failed to save message to database",
        variant: "destructive",
      });
      
      return { 
        success: false, 
        error: `Database error: ${conversationError.message}`,
        debugInfo: { step: 'conversation_creation', conversationError, conversationData }
      };
    }

    debugLog('info', 'Conversation Created Successfully', { conversationId: conversation.id });

    // Step 4: Send SMS via edge function
    debugLog('info', 'Sending SMS', {
      conversationId: conversation.id,
      phoneNumber: leadValidation.leadData!.selectedPhone,
      messageLength: messageBody.trim().length
    });

    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: leadValidation.leadData!.selectedPhone,
        body: messageBody.trim(),
        conversationId: conversation.id
      }
    });

    if (smsError || !smsResult?.success) {
      const smsErrorMsg = smsResult?.error || smsError?.message || 'SMS sending failed';
      debugLog('error', 'SMS Sending Failed', { 
        error: smsErrorMsg,
        smsResult,
        smsError 
      });

      // Update conversation with error status
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: smsErrorMsg
        })
        .eq('id', conversation.id);

      toast({
        title: "SMS Error",
        description: `Failed to send SMS: ${smsErrorMsg}`,
        variant: "destructive",
      });

      return { 
        success: false, 
        error: smsErrorMsg,
        debugInfo: { step: 'sms_sending', smsResult, smsError, conversationId: conversation.id }
      };
    }

    // Step 5: Update conversation with success
    debugLog('info', 'SMS Sent Successfully', { 
      conversationId: conversation.id,
      smsResult 
    });

    await supabase
      .from('conversations')
      .update({
        sms_status: 'sent',
        twilio_message_id: smsResult.telnyxMessageId || smsResult.messageSid
      })
      .eq('id', conversation.id);

    // Step 6: Update lead status if needed
    if (leadValidation.leadData!.status === 'new') {
      debugLog('info', 'Updating Lead Status', { leadId, from: 'new', to: 'engaged' });
      
      const { error: statusUpdateError } = await supabase
        .from('leads')
        .update({ status: 'engaged' })
        .eq('id', leadId);

      if (statusUpdateError) {
        debugLog('warn', 'Lead Status Update Failed', { 
          leadId, 
          error: statusUpdateError.message 
        });
        // Don't fail the whole operation for this
      } else {
        debugLog('info', 'Lead Status Updated Successfully', { leadId });
      }
    }

    debugLog('info', 'Message Send Completed Successfully', {
      conversationId: conversation.id,
      leadName: `${leadValidation.leadData!.first_name} ${leadValidation.leadData!.last_name}`,
      phoneNumber: leadValidation.leadData!.selectedPhone
    });

    toast({
      title: "Message sent successfully!",
      description: `Message delivered to ${leadValidation.leadData!.first_name}`,
    });

    return {
      success: true,
      conversationId: conversation.id,
      debugInfo: {
        step: 'completed',
        conversationId: conversation.id,
        leadData: leadValidation.leadData,
        profileData: profileValidation.cleanedProfile,
        smsResult
      }
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    debugLog('error', 'Message Send Exception', { 
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined
    });

    toast({
      title: "Unexpected Error",
      description: errorMsg,
      variant: "destructive",
    });

    return {
      success: false,
      error: errorMsg,
      debugInfo: { step: 'exception', error: errorMsg }
    };
  }
};
