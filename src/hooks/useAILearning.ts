
import { useState, useEffect, useCallback } from 'react';
import { aiLearningService } from '@/services/aiLearningService';

export const useAILearning = (leadId?: string) => {
  const [learningData, setLearningData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [effectiveness, setEffectiveness] = useState<any>(null);

  // Submit message feedback
  const submitFeedback = useCallback(async (feedback: any) => {
    try {
      setLoading(true);
      const result = await aiLearningService.submitMessageFeedback(feedback);
      
      // Refresh learning data if we have a leadId
      if (leadId) {
        await refreshLearningData();
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Track learning outcome
  const trackOutcome = useCallback(async (outcome: any) => {
    try {
      const result = await aiLearningService.trackLearningOutcome(outcome);
      
      if (leadId) {
        await refreshLearningData();
      }
      
      return result;
    } catch (error) {
      console.error('Error tracking outcome:', error);
      throw error;
    }
  }, [leadId]);

  // Analyze message effectiveness
  const analyzeEffectiveness = useCallback(async (messageContent: string) => {
    if (!leadId) return null;
    
    try {
      setLoading(true);
      const analysis = await aiLearningService.analyzeMessageEffectiveness(messageContent, leadId);
      setEffectiveness(analysis);
      return analysis;
    } catch (error) {
      console.error('Error analyzing effectiveness:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Refresh learning data for the lead
  const refreshLearningData = useCallback(async () => {
    if (!leadId) return;
    
    try {
      setLoading(true);
      const analysis = await aiLearningService.analyzeMessageEffectiveness('', leadId);
      setLearningData(analysis);
    } catch (error) {
      console.error('Error refreshing learning data:', error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Load initial data
  useEffect(() => {
    if (leadId) {
      refreshLearningData();
    }
  }, [leadId, refreshLearningData]);

  return {
    learningData,
    effectiveness,
    loading,
    submitFeedback,
    trackOutcome,
    analyzeEffectiveness,
    refreshLearningData
  };
};

// Hook for getting performance metrics
export const useAIPerformanceMetrics = (timeframe: 'week' | 'month' | 'quarter' = 'month') => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiLearningService.getPerformanceMetrics(timeframe);
      setMetrics(data);
    } catch (err) {
      setError('Failed to load performance metrics');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: loadMetrics
  };
};

// Hook for successful patterns
export const useSuccessfulPatterns = (limit: number = 10) => {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatterns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await aiLearningService.getSuccessfulPatterns(limit);
      setPatterns(data);
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  return {
    patterns,
    loading,
    refresh: loadPatterns
  };
};
