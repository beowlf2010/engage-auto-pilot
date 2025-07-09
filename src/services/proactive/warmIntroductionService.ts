
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export class WarmIntroductionService {
  async generateWarmIntroduction(
    leadId: string,
    leadData: {
      firstName: string;
      lastName: string;
      vehicleInterest: string;
      source: string;
    }
  ): Promise<string | null> {
    try {
      console.log('🤝 [WARM INTRO] Generating warm introduction for:', leadId);

      const messageContext: MessageContext = {
        leadId,
        leadName: `${leadData.firstName} ${leadData.lastName}`,
        latestMessage: `New lead interested in ${leadData.vehicleInterest}`,
        conversationHistory: [],
        vehicleInterest: leadData.vehicleInterest
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        console.log('✅ [WARM INTRO] Generated warm introduction:', response.message.substring(0, 100));
        return response.message;
      }

      return null;
    } catch (error) {
      console.error('❌ [WARM INTRO] Error generating warm introduction:', error);
      return null;
    }
  }

  async scheduleWarmIntroduction(
    leadId: string,
    delayMinutes: number = 5
  ): Promise<void> {
    try {
      console.log('⏰ [WARM INTRO] Scheduling warm introduction for:', leadId);

      // Get lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, source, ai_opt_in')
        .eq('id', leadId)
        .single();

      if (!lead?.ai_opt_in) {
        console.log('🚫 [WARM INTRO] AI not enabled for lead');
        return;
      }

      // Generate the introduction message
      const message = await this.generateWarmIntroduction(leadId, {
        firstName: lead.first_name || '',
        lastName: lead.last_name || '',
        vehicleInterest: lead.vehicle_interest || '',
        source: lead.source || ''
      });

      if (message) {
        // In a real implementation, you'd schedule this message
        console.log('📝 [WARM INTRO] Warm introduction ready:', message.substring(0, 100));
        
        await supabase
          .from('ai_conversation_notes')
          .insert({
            lead_id: leadId,
            note_type: 'warm_introduction_generated',
            note_content: `Warm Introduction: ${message.substring(0, 200)}...`
          });
      }

    } catch (error) {
      console.error('❌ [WARM INTRO] Error scheduling warm introduction:', error);
    }
  }
}

export const warmIntroductionService = new WarmIntroductionService();
