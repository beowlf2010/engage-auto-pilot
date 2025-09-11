
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AIMessageSenderState {
  isSending: boolean;
  error: string | null;
}

export const useAIMessageSender = (leadId: string, onMessageSent?: () => void) => {
  const [state, setState] = useState<AIMessageSenderState>({
    isSending: false,
    error: null
  });

  const sendMessage = useCallback(async (generatedMessage: string) => {
    if (!generatedMessage) return;
    
    console.log('📤 [AI MESSAGE SENDER] Sending message for lead:', leadId);
    
    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      // Enable AI opt-in
      console.log('🤖 [AI MESSAGE SENDER] Enabling AI opt-in for lead:', leadId);
      
      const { error: aiOptInError } = await supabase
        .from('leads')
        .update({ ai_opt_in: true })
        .eq('id', leadId);

      if (aiOptInError) {
        console.error('❌ [AI MESSAGE SENDER] Failed to enable AI opt-in:', aiOptInError);
        throw aiOptInError;
      }

      console.log('✅ [AI MESSAGE SENDER] AI opt-in enabled successfully');

      // Get phone number
      console.log('📱 [AI MESSAGE SENDER] Getting phone number for lead:', leadId);
      
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .maybeSingle();

      if (phoneError) {
        console.error('❌ [AI MESSAGE SENDER] Failed to get phone number:', phoneError);
        throw new Error('Failed to get phone number for lead');
      }

      if (!phoneData) {
        console.error('❌ [AI MESSAGE SENDER] No phone number found for lead:', leadId);
        throw new Error('No phone number found for this lead');
      }

      console.log('✅ [AI MESSAGE SENDER] Found phone number:', phoneData.number);

      // Create conversation record
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          body: generatedMessage,
          direction: 'out',
          ai_generated: true,
          sms_status: 'pending'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ [AI MESSAGE SENDER] Failed to create conversation record:', conversationError);
        throw new Error('Failed to save message record');
      }

      console.log('✅ [AI MESSAGE SENDER] Created conversation record:', conversationData.id);

      // Send SMS
      const { data: smsResult, error: sendError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneData.number,
          message: generatedMessage,
          conversationId: conversationData.id
        }
      });

      if (sendError) {
        console.error('❌ [AI MESSAGE SENDER] Failed to send SMS:', sendError);
        
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: sendError.message
          })
          .eq('id', conversationData.id);
        
        throw new Error(sendError.message || 'Failed to send message');
      }

      if (!smsResult?.success) {
        console.error('❌ [AI MESSAGE SENDER] SMS sending failed:', smsResult);
        
        await supabase
          .from('conversations')
          .update({
            sms_status: 'failed',
            sms_error: smsResult?.error || 'SMS sending failed'
          })
          .eq('id', conversationData.id);
        
        throw new Error(smsResult?.error || 'Failed to send message');
      }

      console.log('✅ [AI MESSAGE SENDER] SMS sent successfully:', smsResult);

      // Update conversation with success
      if (smsResult.messageSid) {
        await supabase
          .from('conversations')
          .update({
            sms_status: 'sent',
            twilio_message_id: smsResult.messageSid
          })
          .eq('id', conversationData.id);
      }

      console.log('✅ [AI MESSAGE SENDER] Message sent successfully');

      // Schedule next AI message
      const { scheduleNextAIMessage } = await import('@/services/aiMessageService');
      await scheduleNextAIMessage(leadId);
      console.log('📅 [AI MESSAGE SENDER] Scheduled next AI message');

      toast({
        title: "AI Enabled Successfully",
        description: "The lead has been opted into AI messaging and the initial message has been sent.",
      });

      setState(prev => ({ ...prev, isSending: false }));

      // Wait for database changes to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onMessageSent) {
        console.log('🔄 [AI MESSAGE SENDER] Triggering onMessageSent callback');
        onMessageSent();
      }

    } catch (error) {
      console.error('❌ [AI MESSAGE SENDER] Send failed:', error);
      setState(prev => ({
        ...prev,
        isSending: false,
        error: error instanceof Error ? error.message : 'Failed to send message. Please try again.'
      }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enable AI messaging. Please try again.",
        variant: "destructive"
      });
    }
  }, [leadId, onMessageSent]);

  const reset = useCallback(() => {
    setState({
      isSending: false,
      error: null
    });
  }, []);

  return {
    ...state,
    sendMessage,
    reset
  };
};
