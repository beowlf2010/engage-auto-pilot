
import { useState, useEffect, useCallback } from 'react';
import { behavioralTriggersEngine, BehavioralTrigger } from '@/services/behavioralTriggersEngine';
import { predictiveAnalyticsService, PredictiveInsight, LeadPrediction } from '@/services/predictiveAnalyticsService';
import { realtimeLearningEngine } from '@/services/realtimeLearningEngine';

export const usePhase3Intelligence = () => {
  const [triggers, setTriggers] = useState<BehavioralTrigger[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [processing, setProcessing] = useState(false);
  const [learningActive, setLearningActive] = useState(false);

  // Load behavioral triggers
  const loadTriggers = useCallback(async () => {
    try {
      const pendingTriggers = await behavioralTriggersEngine.getPendingTriggers();
      setTriggers(pendingTriggers);
      return pendingTriggers;
    } catch (error) {
      console.error('Error loading behavioral triggers:', error);
      return [];
    }
  }, []);

  // Process new behavioral triggers
  const processTriggers = useCallback(async () => {
    setProcessing(true);
    try {
      const newTriggers = await behavioralTriggersEngine.processBehavioralTriggers();
      await loadTriggers(); // Refresh the list
      return newTriggers;
    } catch (error) {
      console.error('Error processing behavioral triggers:', error);
      return [];
    } finally {
      setProcessing(false);
    }
  }, [loadTriggers]);

  // Load predictive insights
  const loadInsights = useCallback(async () => {
    try {
      const predictiveInsights = await predictiveAnalyticsService.generatePredictiveInsights();
      setInsights(predictiveInsights);
      return predictiveInsights;
    } catch (error) {
      console.error('Error loading predictive insights:', error);
      return [];
    }
  }, []);

  // Get prediction for specific lead
  const getLeadPrediction = useCallback(async (leadId: string): Promise<LeadPrediction | null> => {
    try {
      return await predictiveAnalyticsService.predictLeadConversion(leadId);
    } catch (error) {
      console.error('Error getting lead prediction:', error);
      return null;
    }
  }, []);

  // Process learning event
  const processLearningEvent = useCallback(async (event: any) => {
    setLearningActive(true);
    try {
      await realtimeLearningEngine.processLearningEvent(event);
    } catch (error) {
      console.error('Error processing learning event:', error);
    } finally {
      setTimeout(() => setLearningActive(false), 1000); // Visual feedback
    }
  }, []);

  // Get optimization insights
  const getOptimizationInsights = useCallback(async (limit = 10) => {
    try {
      return await realtimeLearningEngine.getOptimizationInsights(limit);
    } catch (error) {
      console.error('Error getting optimization insights:', error);
      return [];
    }
  }, []);

  // Mark trigger as processed
  const markTriggerProcessed = useCallback(async (triggerId: string) => {
    try {
      await behavioralTriggersEngine.markTriggerProcessed(triggerId);
      await loadTriggers(); // Refresh the list
    } catch (error) {
      console.error('Error marking trigger as processed:', error);
    }
  }, [loadTriggers]);

  // Auto-load data on mount
  useEffect(() => {
    loadTriggers();
    loadInsights();
  }, [loadTriggers, loadInsights]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadTriggers();
      loadInsights();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadTriggers, loadInsights]);

  return {
    // State
    triggers,
    insights,
    processing,
    learningActive,

    // Actions
    loadTriggers,
    processTriggers,
    loadInsights,
    getLeadPrediction,
    processLearningEvent,
    getOptimizationInsights,
    markTriggerProcessed,

    // Computed values
    criticalTriggers: triggers.filter(t => t.urgencyLevel === 'critical'),
    highIntentInsights: insights.filter(i => i.type === 'conversion_prediction'),
    churnRiskInsights: insights.filter(i => i.type === 'churn_risk')
  };
};
