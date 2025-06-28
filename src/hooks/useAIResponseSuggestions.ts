
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AIResponseSuggestion } from '@/services/aiResponseIntelligence';

interface UseAIResponseSuggestionsProps {
  leadId?: string;
  messages: any[];
}

export const useAIResponseSuggestions = ({ leadId, messages }: UseAIResponseSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<AIResponseSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async () => {
    if (!leadId || messages.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 Generating AI response suggestions for lead:', leadId);

      // Get the last customer message
      const lastCustomerMessage = messages
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];

      if (!lastCustomerMessage) {
        setSuggestions([]);
        return;
      }

      // Create conversation context
      const conversationHistory = messages
        .slice(-10) // Last 10 messages for context
        .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Agent'}: ${msg.body}`)
        .join('\n');

      // Call the intelligent conversation AI function
      const { data, error: functionError } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId,
          leadName: 'Customer', // We don't have lead name in this context
          vehicleInterest: 'Vehicle of Interest',
          conversationHistory,
          isInitialContact: false
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data && data.message) {
        // Convert the AI response into suggestion format
        const suggestion: AIResponseSuggestion = {
          message: data.message,
          confidence: data.confidence || 0.8,
          reasoning: data.reasoning || 'AI-generated response based on conversation context',
          responseType: 'general_response',
          priority: 'medium',
          suggestedActions: []
        };

        setSuggestions([suggestion]);
      } else {
        setSuggestions([]);
      }

    } catch (err) {
      console.error('❌ Error generating AI suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [leadId, messages]);

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestions
  };
};
