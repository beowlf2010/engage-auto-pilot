
import { useState, useCallback } from 'react';
import { 
  generateConversationSummary, 
  analyzeMessageSentiment, 
  generateResponseSuggestions,
  getConversationSummary,
  getMessageSentiments,
  ConversationSummary,
  MessageSentiment,
  ResponseSuggestion
} from '@/services/conversationAnalysisService';

export const useConversationAnalysis = (leadId: string) => {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [sentiments, setSentiments] = useState<MessageSentiment[]>([]);
  const [suggestions, setSuggestions] = useState<ResponseSuggestion[]>([]);
  const [loading, setLoading] = useState({
    summary: false,
    sentiment: false,
    suggestions: false
  });

  const updateSummary = useCallback(async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const newSummary = await generateConversationSummary(leadId);
      setSummary(newSummary);
      return newSummary;
    } catch (error) {
      console.error('Error updating summary:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [leadId]);

  const loadExistingSummary = useCallback(async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const existingSummary = await getConversationSummary(leadId);
      setSummary(existingSummary);
      return existingSummary;
    } catch (error) {
      console.error('Error loading summary:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [leadId]);

  const analyzeSentiment = useCallback(async (conversationId: string, messageBody: string) => {
    setLoading(prev => ({ ...prev, sentiment: true }));
    try {
      const sentiment = await analyzeMessageSentiment(conversationId, messageBody);
      if (sentiment) {
        setSentiments(prev => [sentiment, ...prev]);
      }
      return sentiment;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, sentiment: false }));
    }
  }, []);

  const loadSentiments = useCallback(async (conversationIds: string[]) => {
    setLoading(prev => ({ ...prev, sentiment: true }));
    try {
      const messageSentiments = await getMessageSentiments(conversationIds);
      setSentiments(messageSentiments);
      return messageSentiments;
    } catch (error) {
      console.error('Error loading sentiments:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, sentiment: false }));
    }
  }, []);

  const updateSuggestions = useCallback(async () => {
    setLoading(prev => ({ ...prev, suggestions: true }));
    try {
      const newSuggestions = await generateResponseSuggestions(leadId);
      setSuggestions(newSuggestions);
      return newSuggestions;
    } catch (error) {
      console.error('Error updating suggestions:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, suggestions: false }));
    }
  }, [leadId]);

  const getSentimentForMessage = useCallback((conversationId: string) => {
    return sentiments.find(s => s.conversationId === conversationId);
  }, [sentiments]);

  const getAverageSentiment = useCallback(() => {
    if (sentiments.length === 0) return 0;
    const sum = sentiments.reduce((acc, sentiment) => acc + sentiment.sentimentScore, 0);
    return sum / sentiments.length;
  }, [sentiments]);

  return {
    summary,
    sentiments,
    suggestions,
    loading,
    updateSummary,
    loadExistingSummary,
    analyzeSentiment,
    loadSentiments,
    updateSuggestions,
    getSentimentForMessage,
    getAverageSentiment
  };
};
