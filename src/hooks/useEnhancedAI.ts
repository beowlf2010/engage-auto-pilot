
import { useState, useCallback } from 'react';
import { generateEnhancedIntelligentResponse, IntelligentAIResponse } from '@/services/intelligentConversationAI';
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

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  customerIntent?: any;
  answerGuidance?: any;
  messageType?: string;
}

export const useEnhancedAI = () => {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<EnhancedAIResponse | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);

  // Generate enhanced AI message with quality scoring
  const generateEnhancedMessage = useCallback(async (request: EnhancedAIRequest) => {
    setLoading(true);
    try {
      // Generate enhanced response using the consolidated service
      const response = await generateEnhancedIntelligentResponse({
        leadId: request.leadId,
        leadName: '', // Will be populated from lead data
        vehicleInterest: request.vehicleInterest,
        messages: request.messages,
        leadInfo: request.leadInfo || { phone: '', status: 'new' }
      });
      
      if (response) {
        const enhancedResponse: EnhancedAIResponse = {
          message: response.message,
          confidence: response.confidence,
          reasoning: response.reasoning,
          customerIntent: response.customerIntent,
          answerGuidance: response.answerGuidance,
          messageType: 'enhanced'
        };
        
        setLastResponse(enhancedResponse);
        
        // Mock quality metrics for now
        const quality = {
          score: response.confidence,
          factors: ['conversational_awareness', 'intent_detection']
        };
        
        setQualityMetrics(quality);
        
        return {
          ...enhancedResponse,
          qualityMetrics: quality
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

  // Schedule message with intelligent timing
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

  // Track message performance for learning
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

  // Get quality insights for optimization
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
