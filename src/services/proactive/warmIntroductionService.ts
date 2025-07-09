
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export class WarmIntroductionService {
  async generateWarmIntroduction(
    leadId: string,
    leadData: any,
    context?: {
      timeOfDay?: string;
      daysSinceInquiry?: number;
      vehicleInterest?: string;
    }
  ): Promise<string | null> {
    try {
      console.log('🌟 [WARM INTRO] Generating warm introduction for:', leadId);

      const messageContext: MessageContext = {
        leadId,
        leadName: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'there',
        latestMessage: '',
        conversationHistory: [],
        vehicleInterest: context?.vehicleInterest || leadData.vehicle_interest || ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        console.log('✅ [WARM INTRO] Generated warm introduction');
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
    delayMinutes: number = 15
  ): Promise<boolean> {
    try {
      const scheduledTime = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          next_ai_send_at: scheduledTime.toISOString(),
          ai_stage: 'warm_introduction'
        })
        .eq('id', leadId);

      if (error) {
        console.error('❌ [WARM INTRO] Error scheduling:', error);
        return false;
      }

      console.log('📅 [WARM INTRO] Scheduled for:', scheduledTime);
      return true;
    } catch (error) {
      console.error('❌ [WARM INTRO] Error scheduling warm introduction:', error);
      return false;
    }
  }
}

export const warmIntroductionService = new WarmIntroductionService();

// Export function for backward compatibility
export const generateWarmInitialMessage = async (leadId: string, leadData: any): Promise<string | null> => {
  return await warmIntroductionService.generateWarmIntroduction(leadId, leadData);
};
