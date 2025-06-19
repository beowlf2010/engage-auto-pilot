
import { supabase } from '@/integrations/supabase/client';
import { sendMessage } from '../messagesService';
import { addAIConversationNote } from '../vehicleMention/aiConversationNotes';
import { generateWarmInitialMessage } from './warmIntroductionService';

export interface ProactiveMessageResult {
  success: boolean;
  leadId: string;
  message?: string;
  error?: string;
  messageSource?: string;
}

// Helper function to clean and validate profile data (same as in messagesService)
const cleanProfileData = (profile: any) => {
  if (!profile) {
    console.warn('🔧 [INITIAL MESSAGE SERVICE] No profile provided');
    return null;
  }

  // Handle malformed profile data where values are wrapped in objects
  const cleanProfile = {
    id: typeof profile.id === 'string' ? profile.id : profile.id?.value || null,
    first_name: typeof profile.first_name === 'string' ? profile.first_name : 
                 typeof profile.firstName === 'string' ? profile.firstName :
                 profile.first_name?.value || profile.firstName?.value || 'User',
    last_name: typeof profile.last_name === 'string' ? profile.last_name :
               typeof profile.lastName === 'string' ? profile.lastName :
               profile.last_name?.value || profile.lastName?.value || '',
    email: typeof profile.email === 'string' ? profile.email : profile.email?.value || ''
  };

  console.log('🔧 [INITIAL MESSAGE SERVICE] Cleaned profile data:', {
    originalProfile: profile,
    cleanedProfile: cleanProfile
  });

  // Validate that we have a proper UUID for profile_id
  if (!cleanProfile.id || typeof cleanProfile.id !== 'string' || cleanProfile.id.length !== 36) {
    console.error('❌ [INITIAL MESSAGE SERVICE] Invalid profile ID:', cleanProfile.id);
    return null;
  }

  return cleanProfile;
};

// Send immediate first message when AI is enabled - NOW USES ENHANCED AI WITH WARM INTRODUCTION
export const sendInitialMessage = async (leadId: string, profile: any): Promise<ProactiveMessageResult> => {
  try {
    console.log(`🚀 [INITIAL MESSAGE SERVICE] Starting warm initial proactive message to lead ${leadId}`);
    console.log(`👤 [INITIAL MESSAGE SERVICE] Raw profile data:`, profile);

    // Clean and validate profile data
    const cleanedProfile = cleanProfileData(profile);
    if (!cleanedProfile) {
      return { 
        success: false, 
        leadId, 
        error: 'Invalid or missing profile data',
        messageSource: 'initial_message_service' 
      };
    }

    console.log(`✅ [INITIAL MESSAGE SERVICE] Using cleaned profile:`, cleanedProfile);

    console.log(`📋 [INITIAL MESSAGE SERVICE] Getting lead details for ${leadId}...`);
    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error(`❌ [INITIAL MESSAGE SERVICE] Lead not found:`, leadError);
      return { success: false, leadId, error: 'Lead not found', messageSource: 'initial_message_service' };
    }

    console.log(`📋 [INITIAL MESSAGE SERVICE] Lead data:`, {
      leadId: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      vehicleInterest: lead.vehicle_interest,
      aiOptIn: lead.ai_opt_in
    });

    if (!lead.ai_opt_in) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] AI not enabled for lead ${leadId}`);
      return { success: false, leadId, error: 'AI not enabled for lead', messageSource: 'initial_message_service' };
    }

    console.log(`🔍 [INITIAL MESSAGE SERVICE] Checking for existing messages...`);
    // Check if we've already sent a message
    const { data: existingMessages } = await supabase
      .from('conversations')
      .select('id, body, ai_generated')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(3);

    if (existingMessages && existingMessages.length > 0) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] Already contacted this lead. Existing messages:`, 
        existingMessages.map(msg => ({ id: msg.id, body: msg.body?.substring(0, 50), aiGenerated: msg.ai_generated }))
      );
      return { success: false, leadId, error: 'Already contacted this lead', messageSource: 'initial_message_service' };
    }

    // Generate warm initial message using ENHANCED AI with introduction context
    console.log(`🤖 [INITIAL MESSAGE SERVICE] Generating warm initial message...`);
    const message = await generateWarmInitialMessage(lead, cleanedProfile);
    
    if (!message) {
      console.error(`❌ [INITIAL MESSAGE SERVICE] Failed to generate warm initial message`);
      return { success: false, leadId, error: 'Failed to generate message', messageSource: 'initial_message_service' };
    }

    console.log(`✨ [INITIAL MESSAGE SERVICE] Generated warm message: "${message}"`);

    // Send the message using cleaned profile
    try {
      console.log(`📤 [INITIAL MESSAGE SERVICE] Sending message via messagesService...`);
      await sendMessage(leadId, message, cleanedProfile, true);
      console.log(`✅ [INITIAL MESSAGE SERVICE] Message sent successfully`);
      
      // Get the most recent conversation for this lead to get the message ID
      const { data: recentMessage } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('direction', 'out')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const messageId = recentMessage?.id || null;
      console.log(`📝 [INITIAL MESSAGE SERVICE] Recent message ID: ${messageId}`);

      // Add AI conversation note about initial contact
      try {
        await addAIConversationNote(
          leadId,
          messageId,
          'inventory_discussion',
          `Enhanced AI warm introduction: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
          []
        );
        console.log(`📋 [INITIAL MESSAGE SERVICE] Added conversation note`);
      } catch (noteError) {
        console.warn(`⚠️ [INITIAL MESSAGE SERVICE] Failed to add conversation note:`, noteError);
        // Don't fail the whole operation for this
      }
    } catch (error) {
      console.error('❌ [INITIAL MESSAGE SERVICE] Error sending message:', error);
      return { success: false, leadId, error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`, messageSource: 'initial_message_service' };
    }

    // Update lead status
    console.log(`🔄 [INITIAL MESSAGE SERVICE] Updating lead status...`);
    try {
      await supabase
        .from('leads')
        .update({
          ai_messages_sent: 1,
          ai_stage: 'initial_contact_sent',
          next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', leadId);
      console.log(`✅ [INITIAL MESSAGE SERVICE] Lead status updated successfully`);
    } catch (updateError) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] Failed to update lead status:`, updateError);
      // Don't fail the whole operation for this
    }

    console.log(`✅ [INITIAL MESSAGE SERVICE] Successfully sent warm introduction to ${lead.first_name}: ${message}`);
    
    return { success: true, leadId, message, messageSource: 'initial_message_service' };
  } catch (error) {
    console.error(`❌ [INITIAL MESSAGE SERVICE] Error sending warm introduction to lead ${leadId}:`, error);
    return { 
      success: false, 
      leadId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      messageSource: 'initial_message_service'
    };
  }
};
