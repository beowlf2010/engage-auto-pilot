
import { supabase } from '@/integrations/supabase/client';

// Enhanced message service with better error handling and debugging
export const sendMessage = async (
  leadId: string,
  messageBody: string,
  profile: any,
  isAIGenerated: boolean = false
) => {
  try {
    console.log(`📤 [FIXED MESSAGES] === DEBUGGING MESSAGE SEND ===`);
    console.log(`📤 [FIXED MESSAGES] Lead ID: ${leadId}`);
    console.log(`📤 [FIXED MESSAGES] Message: "${messageBody.substring(0, 50)}..."`);
    console.log(`📤 [FIXED MESSAGES] AI Generated: ${isAIGenerated}`);
    console.log(`📤 [FIXED MESSAGES] Profile received:`, {
      hasProfile: !!profile,
      profileId: profile?.id,
      profileFirstName: profile?.first_name || profile?.firstName,
      profileType: typeof profile
    });

    // Enhanced profile validation and cleaning
    if (!profile) {
      throw new Error('Profile is required but was not provided');
    }

    // Handle different profile data structures
    let cleanProfileId: string;
    let cleanFirstName: string;

    if (typeof profile === 'string') {
      cleanProfileId = profile;
      cleanFirstName = 'User';
    } else if (profile.id) {
      cleanProfileId = typeof profile.id === 'string' ? profile.id : profile.id?.value || profile.id?.toString();
      cleanFirstName = profile.first_name || profile.firstName || 'User';
    } else {
      console.error('❌ [FIXED MESSAGES] Invalid profile structure:', profile);
      throw new Error('Invalid profile data - missing ID');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanProfileId)) {
      console.error('❌ [FIXED MESSAGES] Invalid UUID format for profile ID:', cleanProfileId);
      throw new Error('Invalid profile ID format');
    }

    console.log(`✅ [FIXED MESSAGES] Using cleaned profile:`, {
      id: cleanProfileId,
      firstName: cleanFirstName
    });

    // Get lead data including phone number and current status with better error handling
    console.log(`📱 [FIXED MESSAGES] Fetching lead data for: ${leadId}`);
    
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
      console.error('❌ [FIXED MESSAGES] Lead fetch error:', leadError);
      throw new Error(`Lead not found: ${leadError.message}`);
    }

    if (!lead) {
      console.error('❌ [FIXED MESSAGES] Lead not found for ID:', leadId);
      throw new Error('Lead not found');
    }

    console.log(`📋 [FIXED MESSAGES] Lead found:`, {
      leadName: `${lead.first_name} ${lead.last_name}`,
      currentStatus: lead.status,
      phoneCount: lead.phone_numbers?.length || 0
    });

    // Get primary phone number with fallback
    const phoneNumbers = Array.isArray(lead.phone_numbers) ? lead.phone_numbers : [];
    const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.number || 
                        phoneNumbers[0]?.number;

    if (!primaryPhone) {
      console.error('❌ [FIXED MESSAGES] No phone number found for lead:', leadId);
      console.error('❌ [FIXED MESSAGES] Available phone numbers:', phoneNumbers);
      throw new Error('No phone number found for lead - cannot send message');
    }

    console.log(`📱 [FIXED MESSAGES] Using phone number: ${primaryPhone}`);

    // Create conversation record with enhanced error handling
    const conversationData = {
      lead_id: leadId,
      profile_id: cleanProfileId,
      body: messageBody.trim(),
      direction: 'out',
      sent_at: new Date().toISOString(),
      ai_generated: isAIGenerated,
      sms_status: 'pending'
    };

    console.log(`💾 [FIXED MESSAGES] Creating conversation record:`, {
      leadId: conversationData.lead_id,
      profileId: conversationData.profile_id,
      direction: conversationData.direction,
      aiGenerated: conversationData.ai_generated,
      messageLength: conversationData.body.length
    });

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (conversationError) {
      console.error('❌ [FIXED MESSAGES] Conversation creation error:', conversationError);
      console.error('❌ [FIXED MESSAGES] Failed conversation data:', conversationData);
      throw new Error(`Failed to create conversation record: ${conversationError.message}`);
    }

    console.log(`✅ [FIXED MESSAGES] Created conversation record: ${conversation.id}`);

    // Send SMS via edge function with enhanced error handling
    console.log(`📤 [FIXED MESSAGES] Sending SMS via edge function...`);
    
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: primaryPhone,
        body: messageBody.trim(),
        conversationId: conversation.id
      }
    });

    if (smsError) {
      console.error('❌ [FIXED MESSAGES] SMS sending failed:', smsError);
      
      // Update conversation with error status
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'failed',
          sms_error: smsError.message 
        })
        .eq('id', conversation.id);
      
      throw new Error(`SMS sending failed: ${smsError.message}`);
    }

    console.log(`✅ [FIXED MESSAGES] SMS sent successfully:`, {
      messageId: smsResult?.sid || smsResult?.messageSid,
      status: smsResult?.status
    });

    // Update conversation with SMS details
    const updateData: any = {
      sms_status: 'sent'
    };

    if (smsResult?.sid || smsResult?.messageSid) {
      updateData.twilio_message_id = smsResult.sid || smsResult.messageSid;
    }

    await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversation.id);

    // Update lead status to "engaged" if currently "new"
    if (lead.status === 'new') {
      console.log(`🔄 [FIXED MESSAGES] Updating lead status from "new" to "engaged"`);
      const { error: statusUpdateError } = await supabase
        .from('leads')
        .update({ status: 'engaged' })
        .eq('id', leadId);

      if (statusUpdateError) {
        console.warn('⚠️ [FIXED MESSAGES] Failed to update lead status:', statusUpdateError);
        // Don't throw error for status update failure - message was sent successfully
      } else {
        console.log(`✅ [FIXED MESSAGES] Lead status updated to "engaged"`);
      }
    }

    console.log(`✅ [FIXED MESSAGES] === MESSAGE SENT SUCCESSFULLY ===`);
    console.log(`✅ [FIXED MESSAGES] To: ${lead.first_name} ${lead.last_name} (${primaryPhone})`);
    console.log(`✅ [FIXED MESSAGES] Message: "${messageBody}"`);

    return conversation;
  } catch (error) {
    console.error('❌ [FIXED MESSAGES] === CRITICAL ERROR IN sendMessage ===');
    console.error('❌ [FIXED MESSAGES] Error details:', error);
    console.error('❌ [FIXED MESSAGES] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
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
