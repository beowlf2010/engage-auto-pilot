
import { supabase } from '@/integrations/supabase/client';
import { consolidatedSendMessage, validateProfile } from './consolidatedMessagesService';

// Redirect all message sending through the consolidated service with compliance checks
export const sendMessage = async (
  leadId: string,
  messageContent: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  console.log(`📤 [MESSAGES] Using consolidated service with compliance checks for lead ${leadId}`);
  
  // Validate profile data
  const { isValid, profileId, error } = validateProfile(profile);
  if (!isValid) {
    console.error(`❌ [MESSAGES] Profile validation failed: ${error}`);
    throw new Error(`Profile validation failed: ${error}`);
  }

  // Use the consolidated service with all compliance checks
  return await consolidatedSendMessage({
    leadId,
    messageBody: messageContent,
    profileId: profileId!,
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
