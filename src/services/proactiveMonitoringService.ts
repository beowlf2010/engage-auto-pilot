import { supabase } from '@/integrations/supabase/client';
import { SystemHealthService, SystemHealthReport } from './systemHealthCheck';

interface SystemMetric {
  timestamp: Date;
  healthScore: number;
  criticalIssues: number;
  warnings: number;
  responseTime: number;
  automationQueueHealth: number;
}

interface TrendAnalysis {
  direction: 'improving' | 'degrading' | 'stable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  prediction: string;
  recommendedActions: string[];
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: SystemMetric[]) => boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  autoRemediation?: () => Promise<void>;
}

export class ProactiveMonitoringService {
  private static instance: ProactiveMonitoringService;
  private metrics: SystemMetric[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  static getInstance(): ProactiveMonitoringService {
    if (!ProactiveMonitoringService.instance) {
      ProactiveMonitoringService.instance = new ProactiveMonitoringService();
    }
    return ProactiveMonitoringService.instance;
  }

  constructor() {
    this.initializeAlertRules();
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'health-degradation',
        name: 'System Health Degradation',
        condition: (metrics) => {
          const recent = metrics.slice(-3);
          return recent.length >= 3 && 
                 recent.every(m => m.healthScore < 85) &&
                 recent[0].healthScore > recent[recent.length - 1].healthScore;
        },
        severity: 'warning',
        message: 'System health has been declining over the last 3 checks'
      },
      {
        id: 'critical-threshold',
        name: 'Critical Health Threshold',
        condition: (metrics) => {
          const latest = metrics[metrics.length - 1];
          return latest?.healthScore < 70;
        },
        severity: 'critical',
        message: 'System health has dropped below critical threshold (70%)',
        autoRemediation: async () => {
          await this.triggerSystemRecovery();
        }
      },
      {
        id: 'queue-overload',
        name: 'AI Queue Overload',
        condition: (metrics) => {
          const latest = metrics[metrics.length - 1];
          return latest?.automationQueueHealth < 60;
        },
        severity: 'warning',
        message: 'AI automation queue health is degraded'
      },
      {
        id: 'performance-degradation',
        name: 'Performance Degradation',
        condition: (metrics) => {
          const recent = metrics.slice(-5);
          const avgResponseTime = recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
          return avgResponseTime > 5000; // 5 seconds
        },
        severity: 'warning',
        message: 'System response times are elevated'
      }
    ];
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('🔍 Proactive monitoring already running');
      return;
    }

    console.log('🚀 Starting proactive system monitoring');
    this.isMonitoring = true;

    // Run initial check
    await this.performHealthCheck();

    // Set up periodic monitoring every 15 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 15 * 60 * 1000);

    // Set up trend analysis every hour
    setInterval(async () => {
      await this.performTrendAnalysis();
    }, 60 * 60 * 1000);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('⏹️ Proactive monitoring stopped');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const healthService = SystemHealthService.getInstance();
      const healthReport = await healthService.runComprehensiveSystemCheck();
      const endTime = Date.now();

      // Get AI queue health
      const queueHealth = await this.getAutomationQueueHealth();

      const metric: SystemMetric = {
        timestamp: new Date(),
        healthScore: healthReport.healthScore,
        criticalIssues: healthReport.criticalIssues.length,
        warnings: healthReport.warnings.length,
        responseTime: endTime - startTime,
        automationQueueHealth: queueHealth
      };

      // Store metric
      this.metrics.push(metric);
      
      // Keep only last 100 metrics (about 25 hours of data)
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Store in database for persistence
      await this.storeMetric(metric);

      // Check alert conditions
      await this.checkAlerts();

      console.log(`📊 Health check completed - Score: ${healthReport.healthScore}%`);

    } catch (error) {
      console.error('❌ Proactive monitoring health check failed:', error);
    }
  }

  private async getAutomationQueueHealth(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ai_queue_health')
        .select('queue_health_score')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return 100; // Default to healthy if no data
      }

      return data[0].queue_health_score;
    } catch (error) {
      console.error('Error fetching queue health:', error);
      return 50; // Conservative estimate
    }
  }

  private async storeMetric(metric: SystemMetric): Promise<void> {
    try {
      // Store in automation runs table for now (until types are updated)
      await supabase.from('ai_automation_runs').insert({
        source: 'health_monitor',
        status: 'completed',
        metadata: {
          timestamp: metric.timestamp.toISOString(),
          health_score: metric.healthScore,
          critical_issues: metric.criticalIssues,
          warnings: metric.warnings,
          response_time_ms: metric.responseTime,
          queue_health_score: metric.automationQueueHealth
        }
      });
    } catch (error) {
      // Don't fail monitoring if storage fails
      console.warn('Failed to store metric:', error);
    }
  }

  private async checkAlerts(): Promise<void> {
    for (const rule of this.alertRules) {
      try {
        if (rule.condition(this.metrics)) {
          await this.triggerAlert(rule);
        }
      } catch (error) {
        console.error(`Alert rule ${rule.id} failed:`, error);
      }
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    console.log(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.name} - ${rule.message}`);
    
    // Store alert as automation run for now (until types are updated)
    try {
      await supabase.from('ai_automation_runs').insert({
        source: 'system_alert',
        status: rule.severity === 'critical' ? 'failed' : 'completed',
        error_message: `${rule.name}: ${rule.message}`,
        metadata: {
          alert_type: rule.name,
          severity: rule.severity,
          auto_remediation_attempted: !!rule.autoRemediation,
          triggered_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to store alert:', error);
    }

    // Attempt auto-remediation if available
    if (rule.autoRemediation) {
      try {
        console.log(`🔧 Attempting auto-remediation for ${rule.name}`);
        await rule.autoRemediation();
        console.log(`✅ Auto-remediation completed for ${rule.name}`);
      } catch (error) {
        console.error(`❌ Auto-remediation failed for ${rule.name}:`, error);
      }
    }

    // Send notifications (implement based on preferences)
    await this.sendNotification(rule);
  }

  private async sendNotification(rule: AlertRule): Promise<void> {
    // Implement notification logic (email, SMS, etc.)
    // For now, just log
    console.log(`📢 Notification: ${rule.message}`);
  }

  private async triggerSystemRecovery(): Promise<void> {
    console.log('🔄 Triggering system recovery procedures');
    
    try {
      // 1. Check and fix emergency settings
      await this.checkEmergencySettings();
      
      // 2. Restart failed edge functions (if possible)
      await this.restartCriticalServices();
      
      // 3. Clear stuck queues
      await this.clearStuckQueues();
      
      console.log('✅ System recovery procedures completed');
    } catch (error) {
      console.error('❌ System recovery failed:', error);
      throw error;
    }
  }

  private async checkEmergencySettings(): Promise<void> {
    const { data, error } = await supabase
      .from('ai_emergency_settings')
      .select('ai_disabled')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to check emergency settings:', error);
      return;
    }

    if (data && data.length > 0 && data[0].ai_disabled) {
      console.log('🚨 AI is disabled in emergency settings - manual intervention required');
    }
  }

  private async restartCriticalServices(): Promise<void> {
    // Test critical edge functions and log status
    try {
      const { error } = await supabase.functions.invoke('test-simple', {
        body: { test: true }
      });
      
      if (error) {
        console.error('Critical edge function test failed:', error);
      } else {
        console.log('✅ Critical edge functions are responsive');
      }
    } catch (error) {
      console.error('Failed to test edge functions:', error);
    }
  }

  private async clearStuckQueues(): Promise<void> {
    try {
      // Clear any stuck automation runs older than 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('ai_automation_runs')
        .update({ status: 'failed', error_message: 'Cleared by recovery system - stuck run' })
        .eq('status', 'running')
        .lt('started_at', thirtyMinutesAgo);

      if (error) {
        console.error('Failed to clear stuck queue items:', error);
      } else {
        console.log('✅ Cleared stuck automation runs');
      }
    } catch (error) {
      console.error('Queue cleanup failed:', error);
    }
  }

  async performTrendAnalysis(): Promise<TrendAnalysis> {
    if (this.metrics.length < 5) {
      return {
        direction: 'stable',
        severity: 'low',
        prediction: 'Insufficient data for trend analysis',
        recommendedActions: ['Continue monitoring to build trend data']
      };
    }

    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);

    const recentAvg = recent.reduce((sum, m) => sum + m.healthScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.healthScore, 0) / Math.max(older.length, 1);

    const trend = recentAvg - olderAvg;
    const direction: TrendAnalysis['direction'] = 
      trend > 5 ? 'improving' : 
      trend < -5 ? 'degrading' : 'stable';

    const severity: TrendAnalysis['severity'] = 
      Math.abs(trend) > 20 ? 'critical' :
      Math.abs(trend) > 10 ? 'high' :
      Math.abs(trend) > 5 ? 'medium' : 'low';

    const analysis: TrendAnalysis = {
      direction,
      severity,
      prediction: this.generatePrediction(direction, severity, trend),
      recommendedActions: this.generateRecommendations(direction, severity, recent)
    };

    console.log(`📈 Trend Analysis: ${direction} (${severity}) - ${analysis.prediction}`);
    return analysis;
  }

  private generatePrediction(direction: TrendAnalysis['direction'], severity: TrendAnalysis['severity'], trend: number): string {
    if (direction === 'degrading') {
      if (severity === 'critical') {
        return `System health declining rapidly (${trend.toFixed(1)}% drop). Critical intervention needed within 2-4 hours.`;
      } else if (severity === 'high') {
        return `System health degrading (${trend.toFixed(1)}% drop). Attention needed within 24 hours.`;
      } else {
        return `Minor system health decline (${trend.toFixed(1)}% drop). Monitor closely.`;
      }
    } else if (direction === 'improving') {
      return `System health improving (${trend.toFixed(1)}% increase). Recent optimizations are working.`;
    } else {
      return `System health stable. Continue current monitoring practices.`;
    }
  }

  private generateRecommendations(direction: TrendAnalysis['direction'], severity: TrendAnalysis['severity'], recent: SystemMetric[]): string[] {
    const recommendations: string[] = [];

    if (direction === 'degrading') {
      recommendations.push('Investigate root cause of declining performance');
      recommendations.push('Review recent configuration changes');
      recommendations.push('Check external service dependencies');
      
      if (severity === 'critical') {
        recommendations.push('Consider emergency maintenance window');
        recommendations.push('Prepare rollback procedures');
      }
    }

    const avgResponseTime = recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
    if (avgResponseTime > 3000) {
      recommendations.push('Optimize edge function performance');
      recommendations.push('Review database query efficiency');
    }

    const avgCriticalIssues = recent.reduce((sum, m) => sum + m.criticalIssues, 0) / recent.length;
    if (avgCriticalIssues > 0.5) {
      recommendations.push('Address recurring critical issues');
      recommendations.push('Implement additional error handling');
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters');
      recommendations.push('Continue regular monitoring schedule');
    }

    return recommendations;
  }

  getMetrics(): SystemMetric[] {
    return [...this.metrics];
  }

  getCurrentHealthScore(): number {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].healthScore : 0;
  }

  getIsMonitoring(): boolean {
    return this.isMonitoring;
  }
}
