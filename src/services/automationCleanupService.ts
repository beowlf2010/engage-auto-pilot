import { supabase } from '@/integrations/supabase/client';

export class AutomationCleanupService {
  private static instance: AutomationCleanupService;
  private cleanupInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private isRunning = false;

  static getInstance(): AutomationCleanupService {
    if (!AutomationCleanupService.instance) {
      AutomationCleanupService.instance = new AutomationCleanupService();
    }
    return AutomationCleanupService.instance;
  }

  async startCleanupMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('🧹 [CLEANUP] Already running');
      return;
    }

    console.log('🚀 [CLEANUP] Starting automated cleanup and monitoring...');
    this.isRunning = true;

    // Immediate cleanup
    await this.performCleanup();
    await this.updateSystemHealth();

    // Schedule regular cleanup every 15 minutes
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 15 * 60 * 1000);

    // Schedule health checks every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.updateSystemHealth();
    }, 5 * 60 * 1000);
  }

  stopCleanupMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.isRunning = false;
    console.log('⏹️ [CLEANUP] Stopped automated cleanup');
  }

  async performCleanup(): Promise<void> {
    try {
      console.log('🧹 [CLEANUP] Starting cleanup cycle...');

      // 1. Clear stuck automation runs (older than 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: stuckRuns, error: stuckError } = await supabase
        .from('ai_automation_runs')
        .select('id, started_at, source')
        .eq('status', 'running')
        .lt('started_at', thirtyMinutesAgo);

      if (stuckRuns && stuckRuns.length > 0) {
        console.log(`🚨 [CLEANUP] Found ${stuckRuns.length} stuck automation runs`);
        
        const { error: updateError } = await supabase
          .from('ai_automation_runs')
          .update({ 
            status: 'failed', 
            error_message: 'Auto-cleanup: process timeout',
            completed_at: new Date().toISOString()
          })
          .eq('status', 'running')
          .lt('started_at', thirtyMinutesAgo);

        if (updateError) {
          console.error('❌ [CLEANUP] Failed to clear stuck runs:', updateError);
        } else {
          console.log(`✅ [CLEANUP] Cleared ${stuckRuns.length} stuck automation runs`);
        }
      }

      // 2. Clear expired automation locks
      const { error: lockError } = await supabase
        .from('ai_automation_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (lockError) {
        console.error('❌ [CLEANUP] Failed to clear expired locks:', lockError);
      } else {
        console.log('✅ [CLEANUP] Cleared expired locks');
      }

      // 3. Reset automation control if needed
      await this.ensureAutomationControl();

      // 4. Log cleanup action
      await supabase.from('ai_automation_runs').insert({
        source: 'auto_cleanup',
        status: 'completed',
        metadata: {
          cleanup_type: 'stuck_processes',
          timestamp: new Date().toISOString(),
          stuck_runs_cleared: stuckRuns?.length || 0
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

      console.log('✅ [CLEANUP] Cleanup cycle completed');

    } catch (error) {
      console.error('❌ [CLEANUP] Cleanup cycle failed:', error);
    }
  }

  private async ensureAutomationControl(): Promise<void> {
    try {
      // Check if automation control exists
      const { data: existingControl } = await supabase
        .from('ai_automation_control')
        .select('*')
        .limit(1);

      if (!existingControl || existingControl.length === 0) {
        // Create default automation control
        const { error } = await supabase
          .from('ai_automation_control')
          .insert({
            automation_enabled: true,
            max_concurrent_runs: 3,
            global_timeout_minutes: 4,
            emergency_stop: false
          });

        if (error) {
          console.error('❌ [CLEANUP] Failed to create automation control:', error);
        } else {
          console.log('✅ [CLEANUP] Created default automation control');
        }
      }
    } catch (error) {
      console.error('❌ [CLEANUP] Failed to ensure automation control:', error);
    }
  }

  async updateSystemHealth(): Promise<void> {
    try {
      // Calculate health metrics
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // Count stuck runs
      const { data: stuckRuns } = await supabase
        .from('ai_automation_runs')
        .select('id')
        .eq('status', 'running')
        .lt('started_at', thirtyMinutesAgo.toISOString());

      // Count recent failures
      const { data: recentFailures } = await supabase
        .from('ai_automation_runs')
        .select('id')
        .eq('status', 'failed')
        .gte('started_at', oneHourAgo.toISOString());

      // Count recent processing
      const { data: recentProcessing } = await supabase
        .from('ai_automation_runs')
        .select('id')
        .eq('status', 'running');

      const stuckCount = stuckRuns?.length || 0;
      const failedCount = recentFailures?.length || 0;
      const processingCount = recentProcessing?.length || 0;

      // Calculate health score
      let healthScore = 100;
      if (stuckCount > 0) healthScore = Math.min(healthScore, 40);
      if (failedCount > 5) healthScore = Math.min(healthScore, 50);
      if (failedCount > 3) healthScore = Math.min(healthScore, 70);
      if (processingCount > 5) healthScore = Math.min(healthScore, 80);

      // Update queue health
      await supabase.from('ai_queue_health').insert({
        queue_health_score: healthScore,
        total_processing: processingCount,
        total_overdue: stuckCount,
        total_failed: failedCount
      });

      if (healthScore < 80) {
        console.log(`🚨 [HEALTH] System health degraded: ${healthScore}%`);
        console.log(`   - Stuck runs: ${stuckCount}`);
        console.log(`   - Recent failures: ${failedCount}`);
        console.log(`   - Processing: ${processingCount}`);
      }

    } catch (error) {
      console.error('❌ [HEALTH] Failed to update system health:', error);
    }
  }

  async getSystemHealthStatus(): Promise<{
    healthScore: number;
    stuckRuns: number;
    failedLastHour: number;
    successRate24h: number;
    needsAttention: boolean;
    recommendations: string[];
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // Get stuck runs
      const { data: stuckRuns } = await supabase
        .from('ai_automation_runs')
        .select('id')
        .eq('status', 'running')
        .lt('started_at', thirtyMinutesAgo.toISOString());

      // Get recent failures
      const { data: recentFailures } = await supabase
        .from('ai_automation_runs')
        .select('id')
        .eq('status', 'failed')
        .gte('started_at', oneHourAgo.toISOString());

      // Get 24h runs for success rate
      const { data: runs24h } = await supabase
        .from('ai_automation_runs')
        .select('status')
        .gte('started_at', twentyFourHoursAgo.toISOString());

      const stuckCount = stuckRuns?.length || 0;
      const failedCount = recentFailures?.length || 0;
      const total24h = runs24h?.length || 0;
      const successful24h = runs24h?.filter(r => r.status === 'completed').length || 0;
      const successRate = total24h > 0 ? (successful24h / total24h) * 100 : 0;

      // Calculate health score
      let healthScore = 100;
      if (stuckCount > 0) healthScore = Math.min(healthScore, 30);
      if (failedCount > 5) healthScore = Math.min(healthScore, 50);
      if (successRate < 80) healthScore = Math.min(healthScore, 70);
      if (successRate < 95) healthScore = Math.min(healthScore, 85);

      // Generate recommendations
      const recommendations: string[] = [];
      if (stuckCount > 0) {
        recommendations.push('Clear stuck automation processes immediately');
      }
      if (failedCount > 3) {
        recommendations.push('Investigate message sending failures');
        recommendations.push('Check Twilio/email service connectivity');
      }
      if (successRate < 80) {
        recommendations.push('Review automation configuration');
        recommendations.push('Reduce batch size for better reliability');
      }
      if (recommendations.length === 0) {
        recommendations.push('System operating within normal parameters');
      }

      return {
        healthScore,
        stuckRuns: stuckCount,
        failedLastHour: failedCount,
        successRate24h: successRate,
        needsAttention: healthScore < 80,
        recommendations
      };

    } catch (error) {
      console.error('❌ [HEALTH] Failed to get health status:', error);
      return {
        healthScore: 50,
        stuckRuns: 0,
        failedLastHour: 0,
        successRate24h: 0,
        needsAttention: true,
        recommendations: ['Failed to get system health - check database connectivity']
      };
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const automationCleanupService = AutomationCleanupService.getInstance();