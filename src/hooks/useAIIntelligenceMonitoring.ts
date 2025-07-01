
import { useState, useEffect, useCallback } from 'react';
import { aiIntelligenceInitializer } from '@/services/aiIntelligenceInitializer';

interface AIPerformanceMetrics {
  responseGenerationTime: number;
  intelligenceFactorsApplied: number;
  confidenceScore: number;
  successRate: number;
  totalResponses: number;
  lastUpdated: Date;
}

export const useAIIntelligenceMonitoring = () => {
  const [metrics, setMetrics] = useState<AIPerformanceMetrics>({
    responseGenerationTime: 0,
    intelligenceFactorsApplied: 0,
    confidenceScore: 0,
    successRate: 0,
    totalResponses: 0,
    lastUpdated: new Date()
  });

  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const intelligenceInsights = await aiIntelligenceInitializer.getIntelligenceInsights();
      setInsights(intelligenceInsights);
      
      // Update metrics based on insights
      if (intelligenceInsights?.overview) {
        setMetrics(prev => ({
          ...prev,
          intelligenceFactorsApplied: intelligenceInsights.overview.total_intelligence_factors || 0,
          successRate: intelligenceInsights.overview.services_active / 5 * 100,
          lastUpdated: new Date()
        }));
      }
    } catch (error) {
      console.error('❌ [AI-MONITORING] Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const trackResponseGeneration = useCallback((startTime: number, endTime: number, factors: number, confidence: number) => {
    setMetrics(prev => ({
      ...prev,
      responseGenerationTime: endTime - startTime,
      intelligenceFactorsApplied: factors,
      confidenceScore: confidence,
      totalResponses: prev.totalResponses + 1,
      lastUpdated: new Date()
    }));
  }, []);

  const getPerformanceSummary = useCallback(() => {
    return {
      status: metrics.successRate > 80 ? 'excellent' : metrics.successRate > 60 ? 'good' : 'needs_attention',
      avgResponseTime: metrics.responseGenerationTime,
      totalIntelligenceFactors: metrics.intelligenceFactorsApplied,
      overallConfidence: metrics.confidenceScore,
      systemHealth: insights?.overview?.integration_health || 'unknown'
    };
  }, [metrics, insights]);

  useEffect(() => {
    loadInsights();
    
    // Refresh insights every 5 minutes
    const interval = setInterval(loadInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadInsights]);

  return {
    metrics,
    insights,
    isLoading,
    loadInsights,
    trackResponseGeneration,
    getPerformanceSummary
  };
};
