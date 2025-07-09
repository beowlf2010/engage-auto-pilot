
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export class FinnEmailService {
  async generateEmailResponse(
    leadId: string,
    leadName: string,
    emailContent: string,
    vehicleInterest?: string
  ): Promise<string | null> {
    try {
      console.log('📧 [FINN EMAIL] Generating email response for:', leadId);

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: emailContent,
        conversationHistory: [emailContent],
        vehicleInterest: vehicleInterest || ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        console.log('✅ [FINN EMAIL] Generated email response');
        return response.message;
      }

      return null;
    } catch (error) {
      console.error('❌ [FINN EMAIL] Error generating email response:', error);
      return null;
    }
  }

  async processIncomingEmail(
    leadId: string,
    emailData: {
      subject: string;
      body: string;
      sender: string;
    }
  ): Promise<void> {
    try {
      console.log('📧 [FINN EMAIL] Processing incoming email for:', leadId);

      // Get lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, ai_opt_in')
        .eq('id', leadId)
        .single();

      if (!lead?.ai_opt_in) {
        console.log('🚫 [FINN EMAIL] AI not enabled for lead');
        return;
      }

      const response = await this.generateEmailResponse(
        leadId,
        `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        emailData.body,
        lead.vehicle_interest
      );

      if (response) {
        console.log('✅ [FINN EMAIL] Email response generated:', response.substring(0, 100));
        
        // Store the response (in a real implementation, you'd send it)
        await supabase
          .from('ai_conversation_notes')
          .insert({
            lead_id: leadId,
            note_type: 'email_response_generated',
            note_content: `AI Email Response: ${response.substring(0, 200)}...`
          });
      }

    } catch (error) {
      console.error('❌ [FINN EMAIL] Error processing email:', error);
    }
  }
}

export const finnEmailService = new FinnEmailService();
