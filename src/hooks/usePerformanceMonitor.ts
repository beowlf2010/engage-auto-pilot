
import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  apiCallDuration: number;
  memoryUsage: number;
  activeConnections: number;
  lastUpdate: Date;
}

interface PerformanceAlert {
  type: 'slow_render' | 'memory_high' | 'api_slow' | 'connection_issues';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    apiCallDuration: 0,
    memoryUsage: 0,
    activeConnections: 0,
    lastUpdate: new Date()
  });
  
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const renderStartTime = useRef<number>(0);
  const apiStartTimes = useRef<Map<string, number>>(new Map());

  // Monitor component render performance
  const startRenderMeasure = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasure = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    setMetrics(prev => ({
      ...prev,
      renderTime,
      lastUpdate: new Date()
    }));

    // Alert for slow renders (>100ms)
    if (renderTime > 100) {
      const alert: PerformanceAlert = {
        type: 'slow_render',
        message: `Slow render detected: ${renderTime.toFixed(2)}ms`,
        severity: renderTime > 500 ? 'high' : 'medium',
        timestamp: new Date()
      };
      
      setAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
    }
  }, []);

  // Monitor API call performance
  const startAPICall = useCallback((callId: string) => {
    apiStartTimes.current.set(callId, performance.now());
  }, []);

  const endAPICall = useCallback((callId: string) => {
    const startTime = apiStartTimes.current.get(callId);
    if (startTime) {
      const duration = performance.now() - startTime;
      apiStartTimes.current.delete(callId);
      
      setMetrics(prev => ({
        ...prev,
        apiCallDuration: duration,
        lastUpdate: new Date()
      }));

      // Alert for slow API calls (>5 seconds)
      if (duration > 5000) {
        const alert: PerformanceAlert = {
          type: 'api_slow',
          message: `Slow API call: ${duration.toFixed(2)}ms`,
          severity: duration > 10000 ? 'high' : 'medium',
          timestamp: new Date()
        };
        
        setAlerts(prev => [...prev.slice(-9), alert]);
      }
    }
  }, []);

  // Monitor memory usage
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMemory = memInfo.usedJSHeapSize / 1024 / 1024; // MB
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: usedMemory,
        lastUpdate: new Date()
      }));

      // Alert for high memory usage (>100MB)
      if (usedMemory > 100) {
        const alert: PerformanceAlert = {
          type: 'memory_high',
          message: `High memory usage: ${usedMemory.toFixed(2)}MB`,
          severity: usedMemory > 200 ? 'high' : 'medium',
          timestamp: new Date()
        };
        
        setAlerts(prev => [...prev.slice(-9), alert]);
      }
    }
  }, []);

  // Monitor connection count
  const updateConnectionCount = useCallback((count: number) => {
    setMetrics(prev => ({
      ...prev,
      activeConnections: count,
      lastUpdate: new Date()
    }));

    // Alert for too many connections
    if (count > 5) {
      const alert: PerformanceAlert = {
        type: 'connection_issues',
        message: `High connection count: ${count}`,
        severity: count > 10 ? 'high' : 'medium',
        timestamp: new Date()
      };
      
      setAlerts(prev => [...prev.slice(-9), alert]);
    }
  }, []);

  // Clear old alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const highSeverityAlerts = alerts.filter(a => a.severity === 'high').length;
    const mediumSeverityAlerts = alerts.filter(a => a.severity === 'medium').length;
    
    return {
      status: highSeverityAlerts > 0 ? 'poor' : mediumSeverityAlerts > 2 ? 'fair' : 'good',
      averageRenderTime: metrics.renderTime,
      averageAPITime: metrics.apiCallDuration,
      memoryUsage: metrics.memoryUsage,
      connectionCount: metrics.activeConnections,
      alertCount: alerts.length
    };
  }, [metrics, alerts]);

  // Set up periodic memory monitoring
  useEffect(() => {
    const interval = setInterval(checkMemoryUsage, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkMemoryUsage]);

  return {
    metrics,
    alerts,
    startRenderMeasure,
    endRenderMeasure,
    startAPICall,
    endAPICall,
    updateConnectionCount,
    clearAlerts,
    getPerformanceSummary
  };
};
