
import { useState, useCallback } from 'react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { toast } from '@/hooks/use-toast';

// Simplified response interface for compatibility
interface EnhancedAIResponse {
  message: string;
  confidence: number;
  analysis: {
    leadTemperature: number;
    urgencyLevel: string;
    sentiment: string;
  }
}

export const useEnhancedConversationAI = () => {
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<EnhancedAIResponse | null>(null);

  const analyzeConversation = useCallback(async (
    leadId: string,
    conversationHistory: string,
    latestMessage: string,
    leadName: string,
    vehicleInterest: string
  ) => {
    setLoading(true);
    try {
      console.log('🤖 Simplified conversation analysis using unified AI');
      
      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage,
        conversationHistory: [conversationHistory],
        vehicleInterest
      };

      const response = unifiedAIResponseEngine.generateResponse(messageContext);

      if (response?.message) {
        const analysisResult: EnhancedAIResponse = {
          message: response.message,
          confidence: response.confidence || 0.8,
          analysis: {
            leadTemperature: 75,
            urgencyLevel: 'medium',
            sentiment: 'positive'
          }
        };

        setLastAnalysis(analysisResult);
        console.log('✅ Simplified AI analysis complete');
        
        return analysisResult;
      }

      return null;
    } catch (error) {
      console.error('❌ Error in simplified conversation analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze conversation. Using unified AI instead.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getResponseSuggestion = useCallback((
    leadId: string,
    conversationHistory: string,
    latestMessage: string,
    leadName: string,
    vehicleInterest: string
  ) => {
    return analyzeConversation(leadId, conversationHistory, latestMessage, leadName, vehicleInterest);
  }, [analyzeConversation]);

  return {
    loading,
    lastAnalysis,
    analyzeConversation,
    getResponseSuggestion
  };
};
