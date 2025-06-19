
import { useState, useEffect, useCallback } from 'react';
import { predictiveAnalyticsService, PredictiveInsight, LeadPrediction } from '@/services/predictiveAnalyticsService';
import { automatedDecisionService, AutomatedDecision } from '@/services/automatedDecisionService';

export const usePredictiveAnalytics = () => {
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [decisions, setDecisions] = useState<AutomatedDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load predictive insights
  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const predictiveInsights = await predictiveAnalyticsService.generatePredictiveInsights();
      setInsights(predictiveInsights);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading predictive insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Process automated decisions
  const processDecisions = useCallback(async () => {
    try {
      const automatedDecisions = await automatedDecisionService.processAutomatedDecisions();
      setDecisions(prev => [...prev, ...automatedDecisions]);
      return automatedDecisions;
    } catch (error) {
      console.error('Error processing automated decisions:', error);
      return [];
    }
  }, []);

  // Get lead prediction
  const getLeadPrediction = useCallback(async (leadId: string): Promise<LeadPrediction | null> => {
    try {
      return await predictiveAnalyticsService.predictLeadConversion(leadId);
    } catch (error) {
      console.error('Error getting lead prediction:', error);
      return null;
    }
  }, []);

  // Auto-refresh insights
  useEffect(() => {
    loadInsights();
    const interval = setInterval(loadInsights, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [loadInsights]);

  // Auto-process decisions
  useEffect(() => {
    const processInterval = setInterval(processDecisions, 10 * 60 * 1000); // Every 10 minutes
    return () => clearInterval(processInterval);
  }, [processDecisions]);

  return {
    insights,
    decisions,
    loading,
    lastUpdated,
    loadInsights,
    processDecisions,
    getLeadPrediction
  };
};
