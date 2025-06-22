
import { useState, useEffect, useCallback } from 'react';
import { analyzeMessageSentiment, getMessageSentiments, MessageSentiment } from '@/services/sentimentAnalysisService';
import { intentRecognitionService, ConversationIntent } from '@/services/intentRecognitionService';

export const useSentimentIntent = (leadId: string | null, messages: any[]) => {
  const [sentiments, setSentiments] = useState<MessageSentiment[]>([]);
  const [currentIntent, setCurrentIntent] = useState<ConversationIntent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze sentiment for new messages
  const analyzeSentiment = useCallback(async (conversationId: string, messageBody: string) => {
    if (!messageBody.trim()) return null;
    
    setIsAnalyzing(true);
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
      setIsAnalyzing(false);
    }
  }, []);

  // Analyze intent for the latest customer message
  const analyzeIntent = useCallback((messageText: string, conversationHistory?: string) => {
    try {
      const intent = intentRecognitionService.analyzeIntent(messageText, conversationHistory);
      setCurrentIntent(intent);
      return intent;
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return null;
    }
  }, []);

  // Get conversation context for intent analysis
  const getConversationContext = useCallback(() => {
    if (!messages.length) return '';
    
    return messages
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');
  }, [messages]);

  // Auto-analyze when new messages arrive
  useEffect(() => {
    if (!leadId || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.direction === 'in') {
      // Analyze intent for incoming messages
      const conversationContext = getConversationContext();
      analyzeIntent(latestMessage.body, conversationContext);
      
      // Analyze sentiment
      if (latestMessage.id) {
        analyzeSentiment(latestMessage.id, latestMessage.body);
      }
    }
  }, [leadId, messages, analyzeIntent, analyzeSentiment, getConversationContext]);

  // Load existing sentiments for the conversation
  useEffect(() => {
    if (!leadId || messages.length === 0) return;

    const loadSentiments = async () => {
      try {
        const conversationIds = messages.map(msg => msg.id).filter(Boolean);
        if (conversationIds.length > 0) {
          const existingSentiments = await getMessageSentiments(conversationIds);
          setSentiments(existingSentiments);
        }
      } catch (error) {
        console.error('Error loading sentiments:', error);
      }
    };

    loadSentiments();
  }, [leadId, messages]);

  // Get overall conversation sentiment trend
  const getSentimentTrend = useCallback(() => {
    if (sentiments.length === 0) return null;

    const recentSentiments = sentiments.slice(0, 5); // Last 5 sentiment analyses
    const avgScore = recentSentiments.reduce((sum, s) => sum + s.sentimentScore, 0) / recentSentiments.length;
    const avgConfidence = recentSentiments.reduce((sum, s) => sum + s.confidenceScore, 0) / recentSentiments.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentSentiments.length >= 3) {
      const recent = recentSentiments.slice(0, 2);
      const older = recentSentiments.slice(2, 4);
      const recentAvg = recent.reduce((sum, s) => sum + s.sentimentScore, 0) / recent.length;
      const olderAvg = older.reduce((sum, s) => sum + s.sentimentScore, 0) / older.length;
      
      if (recentAvg > olderAvg + 0.1) trend = 'improving';
      else if (recentAvg < olderAvg - 0.1) trend = 'declining';
    }

    return {
      averageScore: avgScore,
      averageConfidence: avgConfidence,
      trend,
      totalAnalyses: sentiments.length
    };
  }, [sentiments]);

  // Get the most recent sentiment
  const getLatestSentiment = useCallback(() => {
    return sentiments.length > 0 ? sentiments[0] : null;
  }, [sentiments]);

  return {
    sentiments,
    currentIntent,
    isAnalyzing,
    analyzeSentiment,
    analyzeIntent,
    getSentimentTrend,
    getLatestSentiment,
    getConversationContext
  };
};
