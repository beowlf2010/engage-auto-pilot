
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export class EnhancedMessageProcessor {
  private isProcessing = false;

  async processIncomingMessage(
    leadId: string,
    messageBody: string,
    leadData: any
  ): Promise<string | null> {
    if (this.isProcessing) {
      console.log('🚫 [PROCESSOR] Already processing, skipping');
      return null;
    }

    // CRITICAL: Check if AI processing is allowed
    if (!await this.shouldProcessMessage(leadId)) {
      console.log('🚫 [PROCESSOR] AI processing disabled for this lead');
      return null;
    }

    this.isProcessing = true;

    try {
      console.log('⚡ [PROCESSOR] Processing incoming message for lead:', leadId);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('body')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })
        .limit(10);

      const conversationHistory = conversations?.map(c => c.body) || [];

      const messageContext: MessageContext = {
        leadId,
        leadName: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'there',
        latestMessage: messageBody,
        conversationHistory,
        vehicleInterest: leadData.vehicle_interest || ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        console.log('✅ [PROCESSOR] Generated response successfully');
        
        // Send the message using the consolidated service
        const { sendMessage } = await import('./messagesService');
        
        try {
          const result = await sendMessage(leadId, response.message, null, true);
          if (result.success) {
            console.log('✅ [PROCESSOR] Message sent successfully via consolidated service');
            return response.message;
          } else {
            console.error('❌ [PROCESSOR] Failed to send message:', result.error);
            return null;
          }
        } catch (sendError) {
          console.error('❌ [PROCESSOR] Error sending message:', sendError);
          return null;
        }
      }

      return null;

    } catch (error) {
      console.error('❌ [PROCESSOR] Error processing message:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  async shouldProcessMessage(leadId: string): Promise<boolean> {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('ai_opt_in')
        .eq('id', leadId)
        .single();

      return lead?.ai_opt_in === true;
    } catch (error) {
      console.error('❌ [PROCESSOR] Error checking if should process:', error);
      return false;
    }
  }
}

export const enhancedMessageProcessor = new EnhancedMessageProcessor();

// Export setup function for backward compatibility
export const setupMessageProcessor = () => {
  console.log('🔧 [PROCESSOR] Enhanced message processor initialized');
  
  // Return cleanup function
  return () => {
    console.log('🧹 [PROCESSOR] Enhanced message processor cleaned up');
  };
};
