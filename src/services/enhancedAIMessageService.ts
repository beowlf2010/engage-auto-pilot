
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export class EnhancedAIMessageService {
  async generateEnhancedMessage(
    leadId: string,
    leadName: string,
    customerMessage: string,
    conversationHistory: string[],
    vehicleInterest?: string
  ): Promise<string | null> {
    try {
      console.log('🚀 [ENHANCED AI] Generating enhanced message for lead:', leadId);

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: customerMessage,
        conversationHistory,
        vehicleInterest: vehicleInterest || ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        console.log('✅ [ENHANCED AI] Generated enhanced message');
        return response.message;
      }

      return null;
    } catch (error) {
      console.error('❌ [ENHANCED AI] Error generating enhanced message:', error);
      return null;
    }
  }

  async analyzeMessageQuality(message: string): Promise<{
    score: number;
    suggestions: string[];
  }> {
    try {
      const quality = unifiedAIResponseEngine.validateResponseQuality(message);
      
      return {
        score: quality.isValid ? 85 : 60,
        suggestions: quality.issues
      };
    } catch (error) {
      console.error('❌ [ENHANCED AI] Error analyzing message quality:', error);
      return {
        score: 50,
        suggestions: ['Could not analyze message quality']
      };
    }
  }
}

export const enhancedAIMessageService = new EnhancedAIMessageService();
