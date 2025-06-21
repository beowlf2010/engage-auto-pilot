
import { supabase } from '@/integrations/supabase/client';
import { sendMessage as fixedSendMessage } from './fixedMessagesService';

// Redirect all message sending through the working fixed service
export const sendMessage = async (
  leadId: string,
  messageContent: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  console.log(`📤 [MESSAGES] Redirecting to fixed message service for lead ${leadId}`);
  return await fixedSendMessage(leadId, messageContent, profile, isAIGenerated);
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
