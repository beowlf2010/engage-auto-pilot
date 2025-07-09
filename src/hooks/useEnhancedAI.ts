
import { useState, useCallback } from 'react';
import { unifiedAIResponseEngine, MessageContext, UnifiedAIResponse } from '@/services/unifiedAIResponseEngine';
import { messageQualityService } from '@/services/messageQualityService';
import { intelligentSchedulingService } from '@/services/intelligentSchedulingService';

export interface EnhancedAIRequest {
  leadId: string;
  vehicleInterest: string;
  messages: Array<{
    id: string;
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated?: boolean;
  }>;
  leadInfo?: {
    phone: string;
    status: string;
    lastReplyAt?: string;
  };
}

export const useEnhancedAI = () => {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<UnifiedAIResponse | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);

  const generateEnhancedMessage = useCallback(async (request: EnhancedAIRequest) => {
    setLoading(true);
    try {
      const messageContext: MessageContext = {
        leadId: request.leadId,
        leadName: '', // Will be populated from lead data if needed
        latestMessage: request.messages.filter(m => m.direction === 'in').slice(-1)[0]?.body || '',
        conversationHistory: request.messages.map(m => m.body),
        vehicleInterest: request.vehicleInterest
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response) {
        setLastResponse(response);
        
        const quality = unifiedAIResponseEngine.validateResponseQuality(response.message);
        
        setQualityMetrics({
          score: response.confidence,
          factors: ['unified_intent_detection', 'professional_templates', 'context_awareness'],
          isValid: quality.isValid,
          issues: quality.issues
        });
        
        return {
          ...response,
          qualityMetrics: {
            score: response.confidence,
            factors: ['unified_intent_detection', 'professional_templates']
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error generating enhanced message:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleIntelligentMessage = useCallback(async (
    leadId: string,
    messageContent: string,
    context: {
      messageType: 'initial' | 'follow_up' | 'nurture' | 'closing';
      urgencyLevel: 'low' | 'normal' | 'high';
    }
  ) => {
    try {
      const result = await intelligentSchedulingService.scheduleMessage(
        leadId,
        messageContent,
        {
          leadId,
          messageType: context.messageType,
          urgencyLevel: context.urgencyLevel
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error scheduling intelligent message:', error);
      throw error;
    }
  }, []);

  const trackMessagePerformance = useCallback(async (
    messageId: string,
    leadId: string,
    responseReceived: boolean,
    responseTimeHours?: number
  ) => {
    try {
      await messageQualityService.trackMessagePerformance(
        messageId,
        leadId,
        responseReceived,
        responseTimeHours
      );
    } catch (error) {
      console.error('Error tracking message performance:', error);
    }
  }, []);

  const getQualityInsights = useCallback(async () => {
    try {
      return await messageQualityService.getQualityInsights();
    } catch (error) {
      console.error('Error getting quality insights:', error);
      return {
        averageQuality: 0,
        bestPerformingTypes: [],
        improvementAreas: []
      };
    }
  }, []);

  return {
    loading,
    lastResponse,
    qualityMetrics,
    generateEnhancedMessage,
    scheduleIntelligentMessage,
    trackMessagePerformance,
    getQualityInsights
  };
};
