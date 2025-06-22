
import { useState, useCallback, useEffect } from 'react';
import { contextualAIAssistant, ContextualInsights, AIRecommendation } from '@/services/contextualAIAssistant';
import { enhancedMessageGenerationService } from '@/services/enhancedMessageGenerationService';
import { realTimeContextSync } from '@/services/realTimeContextSync';
import { toast } from '@/hooks/use-toast';

export const useContextualAI = (leadId: string | null) => {
  const [insights, setInsights] = useState<ContextualInsights | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedMessage, setLastAnalyzedMessage] = useState<string>('');
  const [contextSyncStatus, setContextSyncStatus] = useState({
    isActive: false,
    lastSync: null as Date | null,
    contextScore: 0
  });

  // Initialize context sync when leadId changes
  useEffect(() => {
    if (leadId) {
      initializeContextSync(leadId);
      return () => {
        realTimeContextSync.stopContextSync(leadId);
      };
    }
  }, [leadId]);

  const initializeContextSync = async (leadId: string) => {
    try {
      await realTimeContextSync.startContextSync(leadId);
      const status = await realTimeContextSync.getContextSyncStatus(leadId);
      setContextSyncStatus(status);
      console.log('✅ Context sync initialized for lead:', leadId);
    } catch (error) {
      console.error('❌ Error initializing context sync:', error);
    }
  };

  const analyzeConversation = useCallback(async (
    conversationHistory: string,
    latestMessage: string
  ) => {
    if (!leadId || !latestMessage || latestMessage === lastAnalyzedMessage) {
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('🧠 Enhanced AI analyzing conversation with real-time context sync');
      
      const contextualInsights = await contextualAIAssistant.analyzeConversationContext(
        leadId,
        conversationHistory,
        latestMessage
      );

      setInsights(contextualInsights);
      setLastAnalyzedMessage(latestMessage);
      
      console.log('✅ Enhanced contextual analysis complete:', {
        temperature: contextualInsights.leadTemperature,
        urgency: contextualInsights.urgencyLevel,
        stage: contextualInsights.conversationStage,
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
            title: "🚨 Critical Follow-up Scheduled",
            description: "AI has automatically scheduled a high-priority follow-up based on enhanced analysis",
            variant: "default"
          });
        }
      }

      // Show enhanced insights
      if (contextualInsights.leadTemperature > 80) {
        toast({
          title: "🔥 Hot Lead Alert!",
          description: `Lead temperature: ${contextualInsights.leadTemperature}%. Stage: ${contextualInsights.conversationStage}`,
        });
      }

    } catch (error) {
      console.error('❌ Error in enhanced contextual AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze conversation context with enhanced AI",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [leadId, lastAnalyzedMessage]);

  const executeRecommendation = useCallback(async (action: AIRecommendation) => {
    try {
      console.log('🎯 Executing enhanced AI recommendation:', action.action);

      if (action.automatable) {
        switch (action.type) {
          case 'immediate':
            // Generate contextual message for immediate actions
            if (action.id === 'ai_response' && insights) {
              const messageResponse = await enhancedMessageGenerationService.generateContextualMessage({
                leadId: leadId!,
                conversationHistory: '',
                messageType: 'response',
                urgencyLevel: insights.urgencyLevel
              });

              if (messageResponse) {
                toast({
                  title: "✨ Enhanced AI Response Ready",
                  description: `Generated: "${messageResponse.message.substring(0, 50)}..."`,
                  variant: "default"
                });
              }
            } else {
              toast({
                title: "Action Executed",
                description: action.action,
                variant: "default"
              });
            }
            break;
            
          case 'scheduled':
            if (insights) {
              await contextualAIAssistant.scheduleAutomatedFollowUp(leadId!, action, insights);
              toast({
                title: "📅 Enhanced Follow-up Scheduled",
                description: `Scheduled: ${action.action}`,
                variant: "default"
              });
            }
            break;
        }
      } else {
        toast({
          title: "💡 Action Guidance",
          description: `Manual action required: ${action.action}`,
          variant: "default"
        });
      }

    } catch (error) {
      console.error('❌ Error executing enhanced recommendation:', error);
      toast({
        title: "Execution Error",
        description: "Failed to execute AI recommendation",
        variant: "destructive"
      });
    }
  }, [leadId, insights]);

  const generateEnhancedMessage = useCallback(async (
    messageType: 'follow_up' | 'response' | 'nurture' | 'closing',
    customContext?: any
  ) => {
    if (!leadId || !insights) return null;

    try {
      setIsAnalyzing(true);
      console.log('📝 Generating enhanced contextual message');

      const messageResponse = await enhancedMessageGenerationService.generateContextualMessage({
        leadId,
        conversationHistory: '',
        messageType,
        urgencyLevel: insights.urgencyLevel,
        customContext
      });

      if (messageResponse) {
        toast({
          title: "✨ Enhanced Message Generated",
          description: `${messageType} message ready with ${messageResponse.confidence * 100}% confidence`,
          variant: "default"
        });
      }

      return messageResponse;
    } catch (error) {
      console.error('❌ Error generating enhanced message:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [leadId, insights]);

  const refreshContextSync = useCallback(async () => {
    if (!leadId) return;

    try {
      const status = await realTimeContextSync.getContextSyncStatus(leadId);
      setContextSyncStatus(status);
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
