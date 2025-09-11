import { useState, useEffect } from 'react';
import { aggressiveCadenceLearningService, TimingInsight } from '@/services/aggressiveCadenceLearningService';

export const useAggressiveCadenceLearning = () => {
  const [insights, setInsights] = useState<TimingInsight[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [timingInsights, summary] = await Promise.all([
        aggressiveCadenceLearningService.analyzeOptimalTiming(),
        aggressiveCadenceLearningService.getPerformanceSummary()
      ]);
      
      setInsights(timingInsights);
      setPerformanceSummary(summary);
      
    } catch (err) {
      console.error('Error loading aggressive cadence learning data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load learning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const trackMessageSent = async (leadId: string, messageId: string | null, templateStage: string, templateContent: string) => {
    try {
      await aggressiveCadenceLearningService.trackMessageSent({
        leadId,
        messageId,
        templateStage,
        templateContent,
        sentAt: new Date()
      });
    } catch (error) {
      console.error('Error tracking message sent:', error);
    }
  };

  const trackResponse = async (leadId: string, messageStage: string, responseTimeHours: number) => {
    try {
      await aggressiveCadenceLearningService.trackResponse(leadId, messageStage, responseTimeHours);
      // Refresh data after tracking
      await loadData();
    } catch (error) {
      console.error('Error tracking response:', error);
    }
  };

  const runAnalysis = async () => {
    try {
      setLoading(true);
      const newInsights = await aggressiveCadenceLearningService.analyzeOptimalTiming();
      setInsights(newInsights);
    } catch (error) {
      console.error('Error running analysis:', error);
      setError('Failed to analyze timing data');
    } finally {
      setLoading(false);
    }
  };

  return {
    insights,
    performanceSummary,
    loading,
    error,
    trackMessageSent,
    trackResponse,
    runAnalysis,
    refresh: loadData
  };
};