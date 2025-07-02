import { useState, useEffect, useCallback } from 'react';
import { smartInboxAIService } from '@/services/smartInboxAIService';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface AIInsight {
  type: 'buying_signal' | 'urgency' | 'sentiment' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface UseSmartInboxAIProps {
  conversations: ConversationListItem[];
  autoUpdate?: boolean;
  updateInterval?: number;
}

export const useSmartInboxAI = ({ 
  conversations, 
  autoUpdate = true, 
  updateInterval = 30000 
}: UseSmartInboxAIProps) => {
  const [aiInsights, setAiInsights] = useState<Record<string, AIInsight[]>>({});
  const [aiMetrics, setAiMetrics] = useState<Record<string, any>>({});
  const [prioritizedConversations, setPrioritizedConversations] = useState<ConversationListItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeConversations = useCallback(async () => {
    if (conversations.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const prioritized = await smartInboxAIService.prioritizeConversations(conversations);
      setPrioritizedConversations(prioritized);

      const topConversations = prioritized.slice(0, 10);
      
      const insightsResults = await Promise.all(
        topConversations.map(async (conv) => {
          const insights = await smartInboxAIService.generateConversationInsights(conv);
          return { leadId: conv.leadId, insights };
        })
      );

      const metricsResults = await Promise.all(
        topConversations.map(async (conv) => {
          const metrics = await smartInboxAIService.getConversationAIMetrics(conv);
          return { leadId: conv.leadId, metrics };
        })
      );

      const newInsights: Record<string, AIInsight[]> = {};
      insightsResults.forEach(({ leadId, insights }) => {
        newInsights[leadId] = insights;
      });
      setAiInsights(newInsights);

      const newMetrics: Record<string, any> = {};
      metricsResults.forEach(({ leadId, metrics }) => {
        newMetrics[leadId] = metrics;
      });
      setAiMetrics(newMetrics);

    } catch (error) {
      console.error('❌ [SMART-INBOX-HOOK] Error during AI analysis:', error);
      setError(error instanceof Error ? error.message : 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [conversations]);

  const generateAIResponse = useCallback(async (conversation: ConversationListItem) => {
    const response = await smartInboxAIService.generateSmartResponse(conversation);
    return response;
  }, []);

  const getConversationInsights = useCallback((leadId: string): AIInsight[] => {
    return aiInsights[leadId] || [];
  }, [aiInsights]);

  const getConversationMetrics = useCallback((leadId: string) => {
    return aiMetrics[leadId] || null;
  }, [aiMetrics]);

  useEffect(() => {
    if (!autoUpdate) return;
    analyzeConversations();
    const interval = setInterval(analyzeConversations, updateInterval);
    return () => clearInterval(interval);
  }, [analyzeConversations, autoUpdate, updateInterval]);

  return {
    aiInsights,
    aiMetrics,
    prioritizedConversations,
    isAnalyzing,
    error,
    generateAIResponse,
    getConversationInsights,
    getConversationMetrics,
    refreshAnalysis: analyzeConversations
  };
};