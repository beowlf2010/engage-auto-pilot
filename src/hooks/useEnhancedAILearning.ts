
import { useState, useEffect } from 'react';
import { enhancedRealtimeLearningService } from '@/services/enhancedRealtimeLearningService';

export const useEnhancedAILearning = (leadId?: string) => {
  const [insights, setInsights] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const optimizationData = await enhancedRealtimeLearningService.getOptimizationInsights(leadId);
      setInsights(optimizationData.insights);
      setMetrics(optimizationData.summary);
      
    } catch (err) {
      console.error('Error loading AI learning data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI learning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [leadId]);

  const trackLearningEvent = async (type: string, data: any) => {
    try {
      if (leadId) {
        await enhancedRealtimeLearningService.processLearningEvent({
          type: type as any,
          leadId,
          data,
          timestamp: new Date()
        });
        // Refresh data after tracking
        await loadData();
      }
    } catch (error) {
      console.error('Error tracking learning event:', error);
    }
  };

  return {
    insights,
    metrics,
    loading,
    error,
    trackLearningEvent,
    refresh: loadData
  };
};
