
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export interface SmartInboxSuggestion {
  id: string;
  message: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  responseType: string;
}

export class SmartInboxAIService {
  private processingCache = new Map<string, boolean>();

  async generateSmartSuggestions(
    leadId: string,
    conversationHistory: string[],
    leadData: any
  ): Promise<SmartInboxSuggestion[]> {
    if (this.processingCache.get(leadId)) {
      console.log('🚫 [SMART INBOX] Already processing for lead:', leadId);
      return [];
    }

    this.processingCache.set(leadId, true);

    try {
      console.log('💡 [SMART INBOX] Generating smart suggestions for:', leadId);

      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (!lastMessage) return [];

      const messageContext: MessageContext = {
        leadId,
        leadName: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'Lead',
        latestMessage: lastMessage,
        conversationHistory,
        vehicleInterest: leadData.vehicle_interest || ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        const suggestion: SmartInboxSuggestion = {
          id: `suggestion-${Date.now()}`,
          message: response.message,
          confidence: response.confidence || 0.8,
          priority: response.confidence && response.confidence > 0.8 ? 'high' : 'medium',
          responseType: response.responseStrategy || 'general'
        };

        console.log('✅ [SMART INBOX] Generated suggestion with confidence:', response.confidence);
        return [suggestion];
      }

      return [];

    } catch (error) {
      console.error('❌ [SMART INBOX] Error generating suggestions:', error);
      return [];
    } finally {
      this.processingCache.delete(leadId);
    }
  }

  async analyzeConversationUrgency(
    leadId: string,
    conversationHistory: string[]
  ): Promise<{
    urgencyLevel: 'low' | 'medium' | 'high';
    reasoning: string;
    recommendedActions: string[];
  }> {
    try {
      console.log('🚨 [SMART INBOX] Analyzing conversation urgency for:', leadId);

      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (!lastMessage) {
        return {
          urgencyLevel: 'low',
          reasoning: 'No recent messages',
          recommendedActions: []
        };
      }

      const messageContext: MessageContext = {
        leadId,
        leadName: 'Lead',
        latestMessage: lastMessage,
        conversationHistory,
        vehicleInterest: ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      const urgencyLevel = response?.confidence && response.confidence > 0.8 ? 'high' : 
                          response?.confidence && response.confidence > 0.6 ? 'medium' : 'low';

      return {
        urgencyLevel,
        reasoning: `Based on message analysis with ${Math.round((response?.confidence || 0.5) * 100)}% confidence`,
        recommendedActions: ['respond_promptly']
      };

    } catch (error) {
      console.error('❌ [SMART INBOX] Error analyzing urgency:', error);
      return {
        urgencyLevel: 'low',
        reasoning: 'Error analyzing conversation',
        recommendedActions: []
      };
    }
  }

  async prioritizeConversations(conversations: any[]): Promise<any[]> {
    try {
      console.log('📊 [SMART INBOX] Prioritizing conversations');

      const prioritized = await Promise.all(
        conversations.map(async (conv) => {
          const urgencyAnalysis = await this.analyzeConversationUrgency(
            conv.lead_id,
            [conv.body || '']
          );

          return {
            ...conv,
            urgencyLevel: urgencyAnalysis.urgencyLevel,
            priority: urgencyAnalysis.urgencyLevel === 'high' ? 1 : 
                     urgencyAnalysis.urgencyLevel === 'medium' ? 2 : 3
          };
        })
      );

      return prioritized.sort((a, b) => a.priority - b.priority);

    } catch (error) {
      console.error('❌ [SMART INBOX] Error prioritizing conversations:', error);
      return conversations;
    }
  }
}

export const smartInboxAIService = new SmartInboxAIService();
