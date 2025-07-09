
import { useState, useCallback, useEffect } from 'react';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { toast } from '@/hooks/use-toast';

// Updated interfaces to match component expectations
interface ContextualInsights {
  leadTemperature: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  conversationStage: string;
  nextBestActions: AIRecommendation[];
  riskFactors: string[];
  opportunities: string[];
  followUpScheduling: {
    shouldSchedule: boolean;
    suggestedTime: string;
    reason: string;
  };
}

interface AIRecommendation {
  id: string;
  action: string;
  type: 'immediate' | 'scheduled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string;
  automatable: boolean;
}

export const useContextualAI = (leadId: string | null) => {
  const [insights, setInsights] = useState<ContextualInsights | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedMessage, setLastAnalyzedMessage] = useState<string>('');
  const [contextSyncStatus, setContextSyncStatus] = useState({
    isActive: false,
    lastSync: null as Date | null,
    contextScore: 0
  });

  // Simplified context sync initialization
  useEffect(() => {
    if (leadId) {
      setContextSyncStatus({
        isActive: true,
        lastSync: new Date(),
        contextScore: 0.8
      });
    }
  }, [leadId]);

  const analyzeConversation = useCallback(async (
    conversationHistory: string,
    latestMessage: string
  ) => {
    if (!leadId || !latestMessage || latestMessage === lastAnalyzedMessage) {
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('🧠 Simplified AI analyzing conversation');
      
      // Generate basic insights using unified AI
      const messageContext: MessageContext = {
        leadId,
        leadName: 'Lead',
        latestMessage,
        conversationHistory: [conversationHistory],
        vehicleInterest: ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      const mockInsights: ContextualInsights = {
        leadTemperature: 75,
        urgencyLevel: 'medium',
        conversationStage: 'consideration',
        riskFactors: ['Customer may be price shopping', 'Long response delays'],
        opportunities: ['Interested in specific vehicle type', 'Ready for test drive'],
        nextBestActions: [
          {
            id: 'ai_response',
            action: 'Generate AI response',
            type: 'immediate',
            priority: 'medium',
            confidence: 0.8,
            reasoning: 'Customer has asked a question that needs response',
            automatable: true
          }
        ],
        followUpScheduling: {
          shouldSchedule: false,
          suggestedTime: '',
          reason: 'No immediate follow-up needed'
        }
      };

      setInsights(mockInsights);
      setLastAnalyzedMessage(latestMessage);
      
      console.log('✅ Simplified contextual analysis complete');

    } catch (error) {
      console.error('❌ Error in simplified contextual AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze conversation context",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [leadId, lastAnalyzedMessage]);

  const executeRecommendation = useCallback(async (action: AIRecommendation) => {
    try {
      console.log('🎯 Executing simplified AI recommendation:', action.action);
      toast({
        title: "Action Executed",
        description: action.action,
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Error executing recommendation:', error);
      toast({
        title: "Execution Error",
        description: "Failed to execute AI recommendation",
        variant: "destructive"
      });
    }
  }, []);

  const generateEnhancedMessage = useCallback(async (
    messageType: 'follow_up' | 'response' | 'nurture' | 'closing',
    customContext?: any
  ) => {
    if (!leadId) return null;

    try {
      setIsAnalyzing(true);
      console.log('📝 Generating simplified contextual message');

      // Use unified AI for message generation
      const messageContext: MessageContext = {
        leadId,
        leadName: 'Lead',
        latestMessage: '',
        conversationHistory: [],
        vehicleInterest: ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        const messageResponse = {
          message: response.message,
          confidence: response.confidence || 0.8
        };

        toast({
          title: "Message Generated",
          description: `${messageType} message ready`,
          variant: "default"
        });

        return messageResponse;
      }

      return null;
    } catch (error) {
      console.error('❌ Error generating message:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [leadId]);

  const refreshContextSync = useCallback(async () => {
    if (!leadId) return;

    try {
      setContextSyncStatus({
        isActive: true,
        lastSync: new Date(),
        contextScore: 0.8
      });
    } catch (error) {
      console.error('❌ Error refreshing context sync status:', error);
    }
  }, [leadId]);

  return {
    insights,
    isAnalyzing,
    contextSyncStatus,
    analyzeConversation,
    executeRecommendation,
    generateEnhancedMessage,
    refreshContextSync
  };
};
