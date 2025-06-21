
import { useState, useCallback } from 'react';
import { enhancedConversationAI, EnhancedAIRequest, EnhancedAIResponse } from '@/services/enhancedConversationAI';
import { messageQualityService } from '@/services/messageQualityService';
import { intelligentSchedulingService } from '@/services/intelligentSchedulingService';

export const useEnhancedAI = () => {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<EnhancedAIResponse | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);

  // Generate enhanced AI message with quality scoring
  const generateEnhancedMessage = useCallback(async (request: EnhancedAIRequest) => {
    setLoading(true);
    try {
      // Generate enhanced response
      const response = await enhancedConversationAI.generateEnhancedResponse(request);
      
      if (response) {
        setLastResponse(response);
        
        // Analyze message quality
        const quality = await messageQualityService.analyzeMessageQuality(
          response.message,
          request.leadId,
          {
            vehicleInterest: request.vehicleInterest,
            messageType: response.messageType
          }
        );
        
        setQualityMetrics(quality);
        
        return {
          ...response,
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
        context
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
