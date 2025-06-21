
import { useState, useCallback } from 'react';
import { generateEnhancedAIResponse, EnhancedAIResponse } from '@/services/enhancedAIResponseGenerator';
import { toast } from '@/hooks/use-toast';

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
      console.log('🤖 Analyzing conversation for enhanced AI response');
      
      const response = await generateEnhancedAIResponse(
        leadId,
        conversationHistory,
        latestMessage,
        leadName,
        vehicleInterest
      );

      if (response) {
        setLastAnalysis(response);
        console.log('✅ Enhanced AI analysis complete:', response.analysis);
        
        // Show insights to user
        if (response.analysis.leadTemperature > 80) {
          toast({
            title: "🔥 Hot Lead Detected!",
            description: `Lead temperature: ${response.analysis.leadTemperature}%. Consider prioritizing this conversation.`,
          });
        }

        return response;
      }

      return null;
    } catch (error) {
      console.error('❌ Error in enhanced conversation analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze conversation. Please try again.",
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
