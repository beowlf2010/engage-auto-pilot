
import React, { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { unknownMessageLearning } from '@/services/unknownMessageLearning';

interface EnhancedMessageWrapperProps {
  onMessageSent?: () => void;
  onLeadsRefresh?: () => void;
}

export const useEnhancedMessageWrapper = ({ onMessageSent, onLeadsRefresh }: EnhancedMessageWrapperProps) => {
  
  const sendEnhancedMessageWrapper = useCallback(async (
    leadId: string,
    messageContent: string,
    isTemplate?: boolean
  ) => {
    try {
      console.log('📤 [ENHANCED WRAPPER] Sending message:', messageContent);

      // Get recent conversation to check for unknown AI scenarios
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      // Check if the most recent customer message was unhandled by AI
      const customerMessages = recentMessages?.filter(msg => msg.direction === 'in') || [];
      const lastCustomerMessage = customerMessages[0];
      
      if (lastCustomerMessage) {
        // Check if AI failed to respond to this message
        const aiResponseAfter = recentMessages?.find(msg => 
          msg.direction === 'out' && 
          msg.ai_generated && 
          new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
        );

        // If no AI response exists, this human response is learning data
        if (!aiResponseAfter) {
          console.log('🧠 [ENHANCED WRAPPER] Capturing human response as learning data');
          
          await unknownMessageLearning.captureHumanResponse(
            leadId,
            lastCustomerMessage.body,
            messageContent,
            lastCustomerMessage.id
          );
        }
      }

      // Send the actual message
      await supabase.from('conversations').insert({
        lead_id: leadId,
        direction: 'out',
        body: messageContent,
        ai_generated: false
      });

      console.log('✅ [ENHANCED WRAPPER] Message sent successfully');
      
      if (onMessageSent) {
        onMessageSent();
      }
      
      if (onLeadsRefresh) {
        onLeadsRefresh();
      }

    } catch (error) {
      console.error('❌ [ENHANCED WRAPPER] Error sending message:', error);
      throw error;
    }
  }, [onMessageSent, onLeadsRefresh]);

  return {
    sendEnhancedMessageWrapper
  };
};
