
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiLearningService } from '@/services/aiLearningService';
import { realtimeLearningService } from '@/services/realtimeLearningService';

export interface LearningInsight {
  type: 'pattern' | 'optimization' | 'prediction' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data?: any;
}

export const useRealtimeLearning = (leadId?: string) => {
  const [learningInsights, setLearningInsights] = useState<any>(null);
  const [optimizationQueue, setOptimizationQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLearning, setIsLearning] = useState(false);

  // Track message outcome in real-time
  const trackMessageOutcome = useCallback(async (messageContent: string, outcomeType: string) => {
    if (!leadId) return;

    try {
      setIsLearning(true);
      await realtimeLearningService.processLearningEvent({
        type: 'message_sent',
        leadId,
        data: {
          content: messageContent,
          stage: 'follow_up'
        },
        timestamp: new Date()
      });

      // Get updated insights
      const insights = await aiLearningService.analyzeMessageEffectiveness(messageContent, leadId);
      setLearningInsights(insights);
    } catch (error) {
      console.error('Error tracking message outcome:', error);
    } finally {
      setIsLearning(false);
    }
  }, [leadId]);

  // Process optimization queue
  const processOptimizationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const insights = await realtimeLearningService.getOptimizationInsights();
      setOptimizationQueue(insights.activeOptimizations || []);
      
      // Process pending optimizations
      for (const optimization of insights.activeOptimizations || []) {
        await realtimeLearningService.processLearningEvent({
          type: 'feedback_submitted',
          leadId: optimization.leadId || 'system',
          data: optimization,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error processing optimization queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit real-time feedback
  const submitRealtimeFeedback = useCallback(async (
    messageContent: string,
    feedbackType: 'positive' | 'negative' | 'neutral',
    rating?: number,
    suggestions?: string
  ) => {
    if (!leadId) return;

    try {
      setIsLearning(true);
      await realtimeLearningService.processLearningEvent({
        type: 'feedback_submitted',
        leadId,
        data: {
          messageContent,
          feedbackType,
          rating,
          suggestions
        },
        timestamp: new Date()
      });

      // Update insights immediately
      const insights = await aiLearningService.analyzeMessageEffectiveness(messageContent, leadId);
      setLearningInsights(insights);
    } catch (error) {
      console.error('Error submitting realtime feedback:', error);
    } finally {
      setIsLearning(false);
    }
  }, [leadId]);

  // Track response received
  const trackResponseReceived = useCallback(async (responseTimeHours: number) => {
    if (!leadId) return;

    try {
      await realtimeLearningService.processLearningEvent({
        type: 'response_received',
        leadId,
        data: {
          responseTimeHours,
          totalResponses: 1
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking response:', error);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      // Load initial insights
      aiLearningService.analyzeMessageEffectiveness('', leadId)
        .then(setLearningInsights)
        .catch(console.error);
    }
  }, [leadId]);

  return {
    learningInsights,
    optimizationQueue,
    loading,
    isLearning,
    trackMessageOutcome,
    processOptimizationQueue,
    submitRealtimeFeedback,
    trackResponseReceived
  };
};
