
import { useState, useEffect, useCallback } from 'react';
import { 
  performanceAnalyticsService,
  type AIPerformanceMetrics,
  type ConversionTrackingData,
  type TeamPerformanceMetrics
} from '@/services/performanceAnalyticsService';

export const usePerformanceAnalytics = (dateRange?: { start: Date; end: Date }) => {
  const [metrics, setMetrics] = useState<AIPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date()
  };

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 [HOOK] Loading performance metrics');
      const range = dateRange || defaultDateRange;
      const performanceMetrics = await performanceAnalyticsService.getAIPerformanceMetrics(range);
      setMetrics(performanceMetrics);
      console.log('✅ [HOOK] Performance metrics loaded:', performanceMetrics);
    } catch (err) {
      console.error('❌ [HOOK] Error loading performance metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const trackConversion = useCallback(async (
    leadId: string, 
    eventType: 'appointment_booked' | 'test_drive' | 'purchase' | 'lead_qualified',
    value: number = 0
  ) => {
    try {
      console.log('🎯 [HOOK] Tracking conversion:', { leadId, eventType, value });
      await performanceAnalyticsService.trackConversion(leadId, eventType, value);
      // Refresh metrics after tracking conversion
      await loadMetrics();
    } catch (err) {
      console.error('❌ [HOOK] Error tracking conversion:', err);
      setError(err instanceof Error ? err.message : 'Failed to track conversion');
    }
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refreshMetrics: loadMetrics,
    trackConversion
  };
};

export const useConversionTracking = (leadId: string | null) => {
  const [conversionData, setConversionData] = useState<ConversionTrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversionData = useCallback(async () => {
    if (!leadId) {
      setConversionData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎯 [HOOK] Loading conversion tracking for lead:', leadId);
      const data = await performanceAnalyticsService.getConversionTracking(leadId);
      setConversionData(data);
      console.log('✅ [HOOK] Conversion data loaded:', data);
    } catch (err) {
      console.error('❌ [HOOK] Error loading conversion data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversion data');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadConversionData();
  }, [loadConversionData]);

  return {
    conversionData,
    isLoading,
    error,
    refreshConversionData: loadConversionData
  };
};

export const useTeamPerformance = () => {
  const [teamMetrics, setTeamMetrics] = useState<TeamPerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('👥 [HOOK] Loading team performance metrics');
      const metrics = await performanceAnalyticsService.getTeamPerformanceMetrics();
      setTeamMetrics(metrics);
      console.log('✅ [HOOK] Team metrics loaded:', metrics);
    } catch (err) {
      console.error('❌ [HOOK] Error loading team metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamMetrics();
  }, [loadTeamMetrics]);

  return {
    teamMetrics,
    isLoading,
    error,
    refreshTeamMetrics: loadTeamMetrics
  };
};
