
import { supabase } from '@/integrations/supabase/client';
import { consolidatedSendMessage, validateProfile } from './consolidatedMessagesService';
import { errorHandlingService } from './errorHandlingService';

// Enhanced message sending service with automatic profile detection for AI automation
export const sendMessage = async (
  leadId: string,
  messageContent: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  console.log(`📤 [MESSAGES] Enhanced service for lead ${leadId}, AI: ${isAIGenerated}`);
  console.log(`📤 [MESSAGES] Message content preview: ${messageContent?.substring(0, 100)}...`);
  console.log(`📤 [MESSAGES] Profile provided:`, {
    hasProfile: !!profile,
    profileId: profile?.id,
    profileEmail: profile?.email
  });
  
  // Handle AI automation case where profile might be null
  let profileId: string | null = null;
  
  if (profile) {
    const { isValid, profileId: validatedProfileId, error } = validateProfile(profile);
    if (!isValid) {
      console.error(`❌ [MESSAGES] Profile validation failed: ${error}`);
      errorHandlingService.handleError(new Error(`Profile validation failed: ${error}`), {
        operation: 'enhanced_send_message_profile_validation',
        leadId,
        additionalData: { messageLength: messageContent?.length || 0, isAIGenerated }
      });
      throw new Error(`Profile validation failed: ${error}`);
    }
    profileId = validatedProfileId!;
    console.log(`✅ [MESSAGES] Using provided profile: ${profileId}`);
  } else if (isAIGenerated) {
    // For AI automation, get any available admin profile
    console.log(`🤖 [MESSAGES] AI automation - finding system profile`);
    const { data: systemProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();
    
    profileId = systemProfile?.id || null;
    console.log(`👤 [MESSAGES] Using system profile: ${profileId}`);
  }

  if (!profileId) {
    const error = new Error('No valid profile found for message sending');
    console.error(`❌ [MESSAGES] ${error.message}`);
    errorHandlingService.handleError(error, {
      operation: 'enhanced_send_message_no_profile',
      leadId,
      additionalData: { 
        messageLength: messageContent?.length || 0, 
        isAIGenerated,
        hasInputProfile: !!profile
      }
    });
    throw error;
  }

  // Use the consolidated service with all compliance checks
  console.log(`📤 [MESSAGES] Calling consolidated service with validated profile: ${profileId}`);
  return await consolidatedSendMessage({
    leadId,
    messageBody: messageContent,
    profileId,
    isAIGenerated
  });
};

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

export const markMessageAsRead = async (conversationId: string) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error marking message as read:', error);
    }
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};
