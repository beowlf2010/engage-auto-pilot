import { supabase } from '@/integrations/supabase/client';

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

// Helper function to clean and validate profile data
const cleanProfileData = (profile: any) => {
  if (!profile) {
    console.warn('🔧 [MESSAGES SERVICE] No profile provided');
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

  console.log('🔧 [MESSAGES SERVICE] Cleaned profile data:', {
    originalProfile: profile,
    cleanedProfile: cleanProfile
  });

  // Validate that we have a proper UUID for profile_id
  if (!cleanProfile.id || typeof cleanProfile.id !== 'string' || cleanProfile.id.length !== 36) {
    console.error('❌ [MESSAGES SERVICE] Invalid profile ID:', cleanProfile.id);
    return null;
  }

  return cleanProfile;
};

export const sendMessage = async (
  leadId: string,
  messageBody: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  try {
    console.log(`📤 [MESSAGES SERVICE] Sending message to lead ${leadId}`);
    console.log(`📝 [MESSAGES SERVICE] Message: "${messageBody.substring(0, 50)}..."`);
    console.log(`🤖 [MESSAGES SERVICE] AI Generated: ${isAIGenerated}`);
    console.log(`👤 [MESSAGES SERVICE] Raw Profile:`, profile);

    // Clean and validate profile data
    const cleanedProfile = cleanProfileData(profile);
    if (!cleanedProfile) {
      throw new Error('Invalid or missing profile data');
    }

    console.log(`✅ [MESSAGES SERVICE] Using cleaned profile:`, {
      id: cleanedProfile.id,
      firstName: cleanedProfile.first_name
    });

    // Get lead data including phone number
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        phone_numbers (
          number,
          is_primary
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ [MESSAGES SERVICE] Lead not found:', leadError);
      throw new Error('Lead not found');
    }

    // Get primary phone number
    const phoneNumbers = Array.isArray(lead.phone_numbers) ? lead.phone_numbers : [];
    const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.number || 
                        phoneNumbers[0]?.number;

    if (!primaryPhone) {
      console.error('❌ [MESSAGES SERVICE] No phone number found for lead');
      throw new Error('No phone number found for lead');
    }

    console.log(`📱 [MESSAGES SERVICE] Sending to phone: ${primaryPhone}`);

    // Create conversation record with cleaned profile_id
    const conversationData = {
      lead_id: leadId,
      profile_id: cleanedProfile.id,
      body: messageBody,
      direction: 'out',
      sent_at: new Date().toISOString(),
      ai_generated: isAIGenerated
    };

    console.log(`💾 [MESSAGES SERVICE] Inserting conversation with data:`, conversationData);

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (conversationError) {
      console.error('❌ [MESSAGES SERVICE] Error creating conversation:', conversationError);
      console.error('❌ [MESSAGES SERVICE] Conversation data that failed:', conversationData);
      throw conversationError;
    }

    console.log(`✅ [MESSAGES SERVICE] Created conversation record:`, conversation.id);

    // Send SMS via edge function
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: primaryPhone,
        body: messageBody,
        conversationId: conversation.id
      }
    });

    if (smsError) {
      console.error('❌ [MESSAGES SERVICE] SMS sending failed:', smsError);
      // Update conversation with error status
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: smsError.message 
        })
        .eq('id', conversation.id);
      throw smsError;
    }

    console.log(`✅ [MESSAGES SERVICE] SMS sent successfully:`, smsResult);

    // Update conversation with SMS details
    await supabase
      .from('conversations')
      .update({
        twilio_message_id: smsResult.sid,
        sms_status: 'sent'
      })
      .eq('id', conversation.id);

    console.log(`✅ [MESSAGES SERVICE] Message sent successfully to ${lead.first_name}`);

    return conversation;
  } catch (error) {
    console.error('❌ [MESSAGES SERVICE] Error in sendMessage:', error);
    throw error;
  }
};

export const updateMessageStatus = async (conversationId: string, status: string, errorMessage: string | null = null) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        sms_status: status,
        sms_error: errorMessage,
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating message status:', error);
    }
  } catch (error) {
    console.error('Error updating message status:', error);
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
