
import { useState, useEffect, useCallback } from 'react';
import { 
  calculateLeadScore, 
  predictChurnRisk, 
  calculateSalesPerformance,
  getAdvancedAnalyticsDashboard,
  type LeadScore, 
  type ChurnPrediction, 
  type SalesPerformanceMetrics 
} from '@/services/leadScoringService';

export const useLeadScoring = (leadId: string | null) => {
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  const [churnPrediction, setChurnPrediction] = useState<ChurnPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateScore = useCallback(async () => {
    if (!leadId) {
      setLeadScore(null);
      setChurnPrediction(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔢 Calculating lead score for:', leadId);
      const [score, churn] = await Promise.all([
        calculateLeadScore(leadId),
        predictChurnRisk(leadId)
      ]);

      setLeadScore(score);
      setChurnPrediction(churn);
      console.log('✅ Lead scoring complete:', { score: score.overallScore, churnRisk: churn.churnProbability });
    } catch (err) {
      console.error('❌ Error calculating lead score:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate lead score');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    calculateScore();
  }, [calculateScore]);

  const refreshScore = useCallback(() => {
    calculateScore();
  }, [calculateScore]);

  return {
    leadScore,
    churnPrediction,
    isLoading,
    error,
    refreshScore
  };
};

export const useSalesPerformance = (salespersonId: string | null) => {
  const [performance, setPerformance] = useState<SalesPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPerformance = useCallback(async () => {
    if (!salespersonId) {
      setPerformance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 Loading sales performance for:', salespersonId);
      const metrics = await calculateSalesPerformance(salespersonId);
      setPerformance(metrics);
      console.log('✅ Performance loaded:', metrics.salespersonName);
    } catch (err) {
      console.error('❌ Error loading performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance');
    } finally {
      setIsLoading(false);
    }
  }, [salespersonId]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  return {
    performance,
    isLoading,
    error,
    refreshPerformance: loadPerformance
  };
};

export const useAdvancedAnalytics = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📈 Loading advanced analytics dashboard...');
      const data = await getAdvancedAnalyticsDashboard();
      setAnalytics(data);
      console.log('✅ Analytics loaded:', data);
    } catch (err) {
      console.error('❌ Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics: loadAnalytics
  };
};
