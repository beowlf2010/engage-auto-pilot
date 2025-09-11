
import { useState, useCallback } from 'react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { toast } from '@/hooks/use-toast';

export const useEnhancedConversationAI = (leadId: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const generateResponse = useCallback(async (
    leadName: string,
    customerMessage: string,
    conversationHistory: string[],
    vehicleInterest?: string,
    leadSource?: string
  ) => {
    if (!leadId || isGenerating) return null;

    setIsGenerating(true);
    try {
      console.log('🤖 Generating enhanced conversation AI response');

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: customerMessage,
        conversationHistory,
        vehicleInterest: vehicleInterest || '',
        leadSource
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        setLastResponse(response.message);
        return {
          message: response.message,
          confidence: response.confidence || 0.8
        };
      }

      return null;
    } catch (error) {
      console.error('Error generating enhanced conversation AI response:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI response",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [leadId, isGenerating]);

  return {
    generateResponse,
    isGenerating,
    lastResponse
  };
};
