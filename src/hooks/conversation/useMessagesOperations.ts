
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
    if (!leadId || !messageBody.trim() || !profile) {
      throw new Error('Lead ID, message body, and profile are required');
    }

    if (sendingMessage) {
      console.log('⏳ [STABLE CONV] Message already sending, ignoring duplicate request');
      return;
    }

    setSendingMessage(true);

    try {
      console.log(`📤 [STABLE CONV] Sending message to lead: ${leadId} (attempt ${retryCount + 1})`);
      console.log(`👤 [STABLE CONV] Using profile: ${profile.id}`);

      // Get the phone number for this lead
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .maybeSingle();

      if (phoneError || !phoneData) {
        throw new Error('No primary phone number found for this lead');
      }

      // Store the conversation record with profile_id
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          profile_id: profile.id,
          body: messageBody.trim(),
          direction: 'out',
          ai_generated: false,
          sent_at: new Date().toISOString(),
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ [STABLE CONV] Conversation creation error:', conversationError);
        throw conversationError;
      }

      console.log(`✅ [STABLE CONV] Created conversation record: ${conversation.id}`);

      // Send SMS
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          body: messageBody.trim(),
          conversationId: conversation.id
        }
      });

      if (error || !data?.success) {
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

      // Update conversation with success
      await supabase
        .from('conversations')
        .update({ 
          sms_status: 'sent', 
          twilio_message_id: data?.telnyxMessageId || data?.messageSid 
        })
        .eq('id', conversation.id);

      // Immediately refresh data for instant UI update
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

      console.log('✅ [STABLE CONV] Message sent successfully and UI refreshed');

    } catch (err) {
      console.error('❌ [STABLE CONV] Error sending message:', err);
      
      // Retry logic for network errors
      if (retryCount < 2 && (err instanceof Error && err.message.includes('network'))) {
        console.log(`🔄 [STABLE CONV] Retrying message send (attempt ${retryCount + 2})`);
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
