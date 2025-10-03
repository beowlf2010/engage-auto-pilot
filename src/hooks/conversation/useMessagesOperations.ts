
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { MessageData } from './conversationTypes';

export const useMessagesOperations = () => {
  const [sendingMessage, setSendingMessage] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Enhanced send message with proper profile handling and retry logic
  const sendMessage = useCallback(async (leadId: string, messageBody: string, retryCount: number = 0) => {
    console.log(`📤 [MESSAGES OPERATIONS] === ENHANCED SEND START ===`);
    console.log(`📤 [MESSAGES OPERATIONS] Lead ID: ${leadId}`);
    console.log(`📤 [MESSAGES OPERATIONS] Message: ${messageBody.substring(0, 50)}...`);
    console.log(`📤 [MESSAGES OPERATIONS] Profile:`, {
      id: profile?.id,
      firstName: profile?.first_name,
      role: profile?.role
    });
    console.log(`📤 [MESSAGES OPERATIONS] Retry count: ${retryCount}`);

    if (!leadId || !messageBody.trim() || !profile) {
      const error = new Error('Lead ID, message body, and profile are required');
      console.error(`❌ [MESSAGES OPERATIONS] Validation failed:`, error.message);
      throw error;
    }

    if (sendingMessage) {
      console.log('⏳ [MESSAGES OPERATIONS] Message already sending, ignoring duplicate request');
      return;
    }

    setSendingMessage(true);

    try {
      console.log(`📱 [MESSAGES OPERATIONS] Looking up phone number for lead: ${leadId}`);

      // Get the phone number for this lead
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .maybeSingle();

      if (phoneError) {
        console.error(`❌ [MESSAGES OPERATIONS] Phone lookup error:`, phoneError);
        throw new Error('Failed to lookup phone number for this lead');
      }

      if (!phoneData) {
        console.error(`❌ [MESSAGES OPERATIONS] No primary phone number found for lead: ${leadId}`);
        throw new Error('No primary phone number found for this lead');
      }

      console.log(`📱 [MESSAGES OPERATIONS] Found phone number: ${phoneData.number}`);

      // Store the conversation record with profile_id and phone_number for thread matching
      console.log(`💾 [MESSAGES OPERATIONS] Creating conversation record with phone: ${phoneData.number}...`);
      
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          profile_id: profile.id,
          phone_number: phoneData.number, // For phone-based thread matching
          body: messageBody.trim(),
          direction: 'out',
          ai_generated: false,
          sent_at: new Date().toISOString(),
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ [MESSAGES OPERATIONS] Conversation creation error:', conversationError);
        throw conversationError;
      }

      console.log(`✅ [MESSAGES OPERATIONS] Created conversation record: ${conversation.id}`);

      // Send SMS with ENHANCED payload including all required fields
      console.log(`📤 [MESSAGES OPERATIONS] Sending SMS with enhanced payload...`);
      
      const smsPayload = {
        to: phoneData.number,
        message: messageBody.trim(),
        conversationId: conversation.id,
        leadId: leadId,
        profileId: profile.id,
        isAIGenerated: false
      };

      console.log(`📤 [MESSAGES OPERATIONS] SMS payload:`, {
        to: smsPayload.to,
        messageLength: smsPayload.message.length,
        conversationId: smsPayload.conversationId,
        leadId: smsPayload.leadId,
        profileId: smsPayload.profileId,
        isAIGenerated: smsPayload.isAIGenerated
      });

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: smsPayload
      });

      console.log(`📤 [MESSAGES OPERATIONS] SMS function response:`, {
        success: data?.success,
        error: error?.message || data?.error,
        messageSid: data?.messageSid || data?.telnyxMessageId
      });

      if (error || !data?.success) {
        console.error(`❌ [MESSAGES OPERATIONS] SMS send failed:`, {
          functionError: error?.message,
          dataError: data?.error,
          fullResponse: data
        });
        
        // Update conversation with failure status
        await supabase
          .from('conversations')
          .update({ 
            sms_status: 'failed', 
            sms_error: data?.error || error?.message || 'Failed to send' 
          })
          .eq('id', conversation.id);
        
        throw new Error(data?.error || error?.message || 'Failed to send message');
      }

      console.log(`✅ [MESSAGES OPERATIONS] SMS sent successfully!`);

      // Update conversation with success
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'sent', 
          twilio_message_id: data?.telnyxMessageId || data?.messageSid 
        })
        .eq('id', conversation.id);

      // Immediately refresh data for instant UI update
      console.log(`🔄 [MESSAGES OPERATIONS] Triggering data refresh...`);
      
      queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', leadId] });
      
      // Trigger multiple refresh events for all systems
      window.dispatchEvent(new CustomEvent('lead-messages-update', { 
        detail: { leadId } 
      }));
      window.dispatchEvent(new CustomEvent('conversation-updated', { 
        detail: { leadId } 
      }));

      console.log('✅ [MESSAGES OPERATIONS] === SEND COMPLETE ===');

    } catch (err) {
      console.error('❌ [MESSAGES OPERATIONS] === SEND FAILED ===');
      console.error('❌ [MESSAGES OPERATIONS] Error details:', err);
      
      // Retry logic for network errors
      if (retryCount < 2 && (err instanceof Error && err.message.includes('network'))) {
        console.log(`🔄 [MESSAGES OPERATIONS] Retrying message send (attempt ${retryCount + 2})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendMessage(leadId, messageBody, retryCount + 1);
      }
      
      throw err;
    } finally {
      setSendingMessage(false);
    }
  }, [profile, queryClient, sendingMessage]);

  return {
    sendingMessage,
    sendMessage
  };
};
