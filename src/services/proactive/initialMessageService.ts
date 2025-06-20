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

// Send immediate first message when AI is enabled - NOW USES SUPER AGGRESSIVE TIMING
export const sendInitialMessage = async (leadId: string, profile: any): Promise<ProactiveMessageResult> => {
  try {
    console.log(`🚀 [INITIAL MESSAGE SERVICE] === SUPER AGGRESSIVE - STARTING INITIAL MESSAGE ===`);
    console.log(`🚀 [INITIAL MESSAGE SERVICE] Lead ID: ${leadId}`);
    console.log(`👤 [INITIAL MESSAGE SERVICE] Raw profile data:`, profile);

    // Clean and validate profile data
    const cleanedProfile = cleanProfileData(profile);
    if (!cleanedProfile) {
      console.error('❌ [INITIAL MESSAGE SERVICE] === PROFILE VALIDATION FAILED ===');
      return { 
        success: false, 
        leadId, 
        error: 'Invalid or missing profile data',
        messageSource: 'initial_message_service' 
      };
    }

    console.log(`✅ [INITIAL MESSAGE SERVICE] Profile validation passed:`, cleanedProfile);

    console.log(`📋 [INITIAL MESSAGE SERVICE] === FETCHING LEAD DETAILS ===`);
    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error(`❌ [INITIAL MESSAGE SERVICE] === LEAD FETCH FAILED ===`, leadError);
      return { success: false, leadId, error: 'Lead not found', messageSource: 'initial_message_service' };
    }

    console.log(`📋 [INITIAL MESSAGE SERVICE] Lead data retrieved:`, {
      leadId: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      vehicleInterest: lead.vehicle_interest,
      aiOptIn: lead.ai_opt_in
    });

    if (!lead.ai_opt_in) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] === AI NOT ENABLED FOR LEAD ===`);
      return { success: false, leadId, error: 'AI not enabled for lead', messageSource: 'initial_message_service' };
    }

    console.log(`🔍 [INITIAL MESSAGE SERVICE] === CHECKING FOR EXISTING MESSAGES ===`);
    // Check if we've already sent a message
    const { data: existingMessages } = await supabase
      .from('conversations')
      .select('id, body, ai_generated')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(3);

    console.log(`📊 [INITIAL MESSAGE SERVICE] Existing outbound messages:`, existingMessages?.length || 0);

    if (existingMessages && existingMessages.length > 0) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] === ALREADY CONTACTED THIS LEAD ===`);
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] Existing messages:`, 
        existingMessages.map(msg => ({ id: msg.id, body: msg.body?.substring(0, 50), aiGenerated: msg.ai_generated }))
      );
      return { success: false, leadId, error: 'Already contacted this lead', messageSource: 'initial_message_service' };
    }

    // Generate warm initial message using ENHANCED AI with introduction context
    console.log(`🤖 [INITIAL MESSAGE SERVICE] === GENERATING SUPER AGGRESSIVE INITIAL MESSAGE ===`);
    
    const message = await generateWarmInitialMessage(lead, cleanedProfile);
    
    if (!message) {
      console.error(`❌ [INITIAL MESSAGE SERVICE] === MESSAGE GENERATION FAILED ===`);
      return { success: false, leadId, error: 'Failed to generate message', messageSource: 'initial_message_service' };
    }

    console.log(`✨ [INITIAL MESSAGE SERVICE] Generated message: "${message}"`);

    // Send the message using cleaned profile
    try {
      console.log(`📤 [INITIAL MESSAGE SERVICE] === SENDING MESSAGE VIA MESSAGES SERVICE ===`);
      
      await sendMessage(leadId, message, cleanedProfile, true);
      console.log(`✅ [INITIAL MESSAGE SERVICE] === MESSAGE SENT SUCCESSFULLY ===`);
      
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
    } catch (sendError) {
      console.error('❌ [INITIAL MESSAGE SERVICE] === MESSAGE SENDING FAILED ===');
      return { success: false, leadId, error: `Failed to send message: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`, messageSource: 'initial_message_service' };
    }

    // Update lead status with super aggressive timing for next messages
    console.log(`🔄 [INITIAL MESSAGE SERVICE] === UPDATING LEAD TO SUPER AGGRESSIVE STATUS ===`);
    try {
      const nextMessageTime = new Date();
      nextMessageTime.setHours(nextMessageTime.getHours() + 2 + Math.random()); // 2-3 hours for second message
      
      await supabase
        .from('leads')
        .update({
          ai_messages_sent: 1,
          ai_stage: 'super_aggressive_followup',
          message_intensity: 'super_aggressive',
          next_ai_send_at: nextMessageTime.toISOString(),
          ai_enabled_at: new Date().toISOString()
        })
        .eq('id', leadId);
      console.log(`✅ [INITIAL MESSAGE SERVICE] Lead updated to super aggressive mode - next message at ${nextMessageTime.toISOString()}`);
    } catch (updateError) {
      console.warn(`⚠️ [INITIAL MESSAGE SERVICE] Failed to update lead status:`, updateError);
    }

    console.log(`✅ [INITIAL MESSAGE SERVICE] === SUPER AGGRESSIVE SUCCESS! ===`);
    console.log(`✅ [INITIAL MESSAGE SERVICE] Successfully sent super aggressive introduction to ${lead.first_name}: ${message}`);
    
    return { success: true, leadId, message, messageSource: 'initial_message_service' };
  } catch (error) {
    console.error(`❌ [INITIAL MESSAGE SERVICE] === CRITICAL EXCEPTION ===`);
    return { 
      success: false, 
      leadId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      messageSource: 'initial_message_service'
    };
  }
};
