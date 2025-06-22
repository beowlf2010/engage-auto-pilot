
import { useState, useCallback, useEffect } from 'react';
import { aiResponseIntelligence } from '@/services/aiResponseIntelligence';
import type { ConversationAnalysis, AIResponseSuggestion } from '@/services/aiResponseIntelligence';

export const useAIIntelligence = (leadId: string | null, messages: any[], leadContext: any) => {
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<AIResponseSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const analyzeConversation = useCallback(async () => {
    if (!leadId || messages.length === 0) {
      setAnalysis(null);
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('🔍 Starting AI conversation analysis');
      const newAnalysis = await aiResponseIntelligence.analyzeConversation(
        leadId,
        messages,
        leadContext
      );
      setAnalysis(newAnalysis);
      console.log('✅ AI analysis complete:', newAnalysis);
    } catch (error) {
      console.error('❌ Error analyzing conversation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [leadId, messages, leadContext]);

  const generateSuggestions = useCallback(async () => {
    if (!analysis || messages.length === 0) {
      setSuggestions([]);
      return;
    }

    const lastCustomerMessage = messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) {
      setSuggestions([]);
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      console.log('🤖 Generating AI response suggestions');
      const newSuggestions = await aiResponseIntelligence.generateResponseSuggestions(
        analysis,
        lastCustomerMessage.body,
        leadContext
      );
      setSuggestions(newSuggestions);
      console.log('✅ Generated', newSuggestions.length, 'suggestions');
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [analysis, messages, leadContext]);

  const refreshAnalysis = useCallback(async () => {
    await analyzeConversation();
  }, [analyzeConversation]);

  const refreshSuggestions = useCallback(async () => {
    await generateSuggestions();
  }, [generateSuggestions]);

  // Auto-analyze when conversation changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      analyzeConversation();
    }, 500); // Debounce analysis

    return () => clearTimeout(timeoutId);
  }, [analyzeConversation]);

  // Auto-generate suggestions when analysis completes
  useEffect(() => {
    if (analysis) {
      generateSuggestions();
    }
  }, [analysis, generateSuggestions]);

  return {
    analysis,
    suggestions,
    isAnalyzing,
    isGeneratingSuggestions,
    refreshAnalysis,
    refreshSuggestions
  };
};
