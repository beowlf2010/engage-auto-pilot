
import { useState, useCallback, useEffect } from 'react';
import { contextualAIAssistant, ContextualInsights, AIRecommendation } from '@/services/contextualAIAssistant';
import { toast } from '@/hooks/use-toast';

export const useContextualAI = (leadId: string | null) => {
  const [insights, setInsights] = useState<ContextualInsights | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedMessage, setLastAnalyzedMessage] = useState<string>('');

  const analyzeConversation = useCallback(async (
    conversationHistory: string,
    latestMessage: string
  ) => {
    if (!leadId || !latestMessage || latestMessage === lastAnalyzedMessage) {
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('🧠 Analyzing conversation for contextual AI assistance');
      
      const contextualInsights = await contextualAIAssistant.analyzeConversationContext(
        leadId,
        conversationHistory,
        latestMessage
      );

      setInsights(contextualInsights);
      setLastAnalyzedMessage(latestMessage);
      
      console.log('✅ Contextual analysis complete:', {
        temperature: contextualInsights.leadTemperature,
        urgency: contextualInsights.urgencyLevel,
        recommendationsCount: contextualInsights.nextBestActions.length
      });

      // Auto-schedule follow-up if critical
      if (contextualInsights.urgencyLevel === 'critical' && 
          contextualInsights.followUpScheduling.shouldSchedule) {
        const criticalAction = contextualInsights.nextBestActions.find(a => a.priority === 'critical');
        if (criticalAction?.automatable) {
          await contextualAIAssistant.scheduleAutomatedFollowUp(
            leadId,
            criticalAction,
            contextualInsights
          );
          
          toast({
            title: "Critical Follow-up Scheduled",
            description: "AI has automatically scheduled a high-priority follow-up",
            variant: "default"
          });
        }
      }

    } catch (error) {
      console.error('❌ Error in contextual AI analysis:', error);
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
      console.log('🎯 Executing AI recommendation:', action.action);

      if (action.automatable) {
        // For automatable actions, trigger the appropriate service
        switch (action.type) {
          case 'immediate':
            toast({
              title: "Action Executed",
              description: action.action,
              variant: "default"
            });
            break;
          case 'scheduled':
            if (insights) {
              await contextualAIAssistant.scheduleAutomatedFollowUp(leadId!, action, insights);
              toast({
                title: "Follow-up Scheduled",
                description: `Scheduled: ${action.action}`,
                variant: "default"
              });
            }
            break;
        }
      } else {
        // For non-automatable actions, show guidance
        toast({
          title: "Manual Action Required",
          description: `Please manually: ${action.action}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ Error executing recommendation:', error);
      toast({
        title: "Execution Error",
        description: "Failed to execute recommendation",
        variant: "destructive"
      });
    }
  }, [leadId, insights]);

  const scheduleFollowUp = useCallback(async () => {
    if (!insights || !leadId) return;

    try {
      console.log('📅 Scheduling AI-recommended follow-up');

      const topRecommendation = insights.nextBestActions[0];
      if (topRecommendation) {
        await contextualAIAssistant.scheduleAutomatedFollowUp(
          leadId,
          topRecommendation,
          insights
        );

        toast({
          title: "Follow-up Scheduled",
          description: `Scheduled for ${insights.followUpScheduling.suggestedTime}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ Error scheduling follow-up:', error);
      toast({
        title: "Scheduling Error",
        description: "Failed to schedule follow-up",
        variant: "destructive"
      });
    }
  }, [leadId, insights]);

  const refreshAnalysis = useCallback(() => {
    setLastAnalyzedMessage(''); // Force re-analysis
  }, []);

  // Reset when lead changes
  useEffect(() => {
    if (leadId) {
      setInsights(null);
      setLastAnalyzedMessage('');
    }
  }, [leadId]);

  return {
    insights,
    isAnalyzing,
    analyzeConversation,
    executeRecommendation,
    scheduleFollowUp,
    refreshAnalysis
  };
};
