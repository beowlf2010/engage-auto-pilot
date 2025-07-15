import { useState, useEffect, useCallback } from 'react';
import { ProactiveMonitoringService } from '@/services/proactiveMonitoringService';
import { ConfigurationValidator } from '@/services/configurationValidator';

interface MonitoringState {
  isActive: boolean;
  currentHealthScore: number;
  lastCheckTime: Date | null;
  trendDirection: 'improving' | 'degrading' | 'stable';
  alertCount: number;
  configurationScore: number;
  recommendations: string[];
}

export const useProactiveMonitoring = () => {
  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
    isActive: false,
    currentHealthScore: 0,
    lastCheckTime: null,
    trendDirection: 'stable',
    alertCount: 0,
    configurationScore: 100,
    recommendations: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monitoringService = ProactiveMonitoringService.getInstance();
  const configValidator = ConfigurationValidator.getInstance();

  const startMonitoring = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await monitoringService.startMonitoring();
      
      setMonitoringState(prev => ({
        ...prev,
        isActive: true,
        lastCheckTime: new Date()
      }));
      
      console.log('✅ Proactive monitoring started');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
      console.error('Failed to start monitoring:', err);
    } finally {
      setIsLoading(false);
    }
  }, [monitoringService]);

  const stopMonitoring = useCallback(() => {
    monitoringService.stopMonitoring();
    setMonitoringState(prev => ({
      ...prev,
      isActive: false
    }));
    console.log('⏹️ Proactive monitoring stopped');
  }, [monitoringService]);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get current metrics
      const metrics = monitoringService.getMetrics();
      const currentScore = monitoringService.getCurrentHealthScore();
      const isActive = monitoringService.getIsMonitoring();
      
      // Perform trend analysis
      const trendAnalysis = await monitoringService.performTrendAnalysis();
      
      // Validate configuration
      const configReport = await configValidator.validateConfiguration();
      
      setMonitoringState({
        isActive,
        currentHealthScore: currentScore,
        lastCheckTime: metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null,
        trendDirection: trendAnalysis.direction,
        alertCount: 0, // TODO: Implement alert counting
        configurationScore: configReport.score,
        recommendations: [
          ...trendAnalysis.recommendedActions,
          ...configReport.issues.flatMap(issue => issue.recommendations.slice(0, 1))
        ].slice(0, 5) // Keep top 5 recommendations
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh status');
      console.error('Failed to refresh monitoring status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [monitoringService, configValidator]);

  const runConfigurationValidation = useCallback(async () => {
    try {
      setIsLoading(true);
      const report = await configValidator.validateConfiguration();
      
      setMonitoringState(prev => ({
        ...prev,
        configurationScore: report.score,
        recommendations: [
          ...prev.recommendations.filter(r => !r.includes('configuration')),
          ...report.issues.flatMap(issue => issue.recommendations.slice(0, 1))
        ].slice(0, 5)
      }));
      
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration validation failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [configValidator]);

  const autoFixIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await configValidator.autoFixIssues();
      
      // Refresh status after fixes
      await refreshStatus();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-fix failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [configValidator, refreshStatus]);

  const getMetricsHistory = useCallback(() => {
    return monitoringService.getMetrics();
  }, [monitoringService]);

  const getSystemRecommendations = useCallback(async () => {
    try {
      const trendAnalysis = await monitoringService.performTrendAnalysis();
      const configReport = await configValidator.validateConfiguration();
      
      return {
        performance: trendAnalysis.recommendedActions,
        configuration: configReport.issues.flatMap(issue => issue.recommendations),
        priority: configReport.issues
          .filter(issue => issue.severity === 'error')
          .map(issue => issue.message)
      };
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      return {
        performance: [],
        configuration: [],
        priority: []
      };
    }
  }, [monitoringService, configValidator]);

  // Auto-refresh status every 5 minutes when monitoring is active
  useEffect(() => {
    if (monitoringState.isActive) {
      const interval = setInterval(refreshStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [monitoringState.isActive, refreshStatus]);

  // Initial status check
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    monitoringState,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    refreshStatus,
    runConfigurationValidation,
    autoFixIssues,
    getMetricsHistory,
    getSystemRecommendations
  };
};