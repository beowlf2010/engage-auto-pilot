
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
        return response.message;
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
