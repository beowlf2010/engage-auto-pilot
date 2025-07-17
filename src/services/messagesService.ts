
import { supabase } from '@/integrations/supabase/client';
import { consolidatedSendMessage, validateProfile } from './consolidatedMessagesService';

// Enhanced message sending service with automatic profile detection for AI automation
export const sendMessage = async (
  leadId: string,
  messageContent: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  console.log(`📤 [MESSAGES] Enhanced service for lead ${leadId}, AI: ${isAIGenerated}`);
  
  // Handle AI automation case where profile might be null
  let profileId: string | null = null;
  
  if (profile) {
    const { isValid, profileId: validatedProfileId, error } = validateProfile(profile);
    if (!isValid) {
      console.error(`❌ [MESSAGES] Profile validation failed: ${error}`);
      throw new Error(`Profile validation failed: ${error}`);
    }
    profileId = validatedProfileId!;
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
    throw new Error('No valid profile found for message sending');
  }

  // Use the consolidated service with all compliance checks
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
