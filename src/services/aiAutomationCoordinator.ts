import { intelligentAutoApproval } from './intelligentAutoApproval';
import { advancedQueueManager } from './advancedQueueManager';
import { predictivePerformanceEngine } from './predictivePerformanceEngine';
import { supabase } from '@/integrations/supabase/client';

export class AIAutomationCoordinator {
  private static instance: AIAutomationCoordinator;
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): AIAutomationCoordinator {
    if (!AIAutomationCoordinator.instance) {
      AIAutomationCoordinator.instance = new AIAutomationCoordinator();
    }
    return AIAutomationCoordinator.instance;
  }

  async startAutomation(): Promise<void> {
    if (this.isRunning) return;

    console.log('🚀 [AI COORDINATOR] Starting AI automation system...');
    this.isRunning = true;

    // Process queue every 2 minutes
    this.processingInterval = setInterval(async () => {
      try {
        await this.processAutomationCycle();
      } catch (error) {
        console.error('❌ [AI COORDINATOR] Automation cycle failed:', error);
      }
    }, 2 * 60 * 1000);

    // Initial processing
    await this.processAutomationCycle();
  }

  stopAutomation(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ [AI COORDINATOR] AI automation stopped');
  }

  private async processAutomationCycle(): Promise<void> {
    console.log('🔄 [AI COORDINATOR] Processing automation cycle...');

    const startTime = Date.now();

    try {
      // 1. Process the approval queue with intelligent analysis
      const queueResult = await advancedQueueManager.processQueue();

      // 2. Store cycle metrics
      await this.storeCycleMetrics({
        processed: queueResult.processed,
        autoApproved: queueResult.autoApproved,
        requiresReview: queueResult.requiresReview,
        rejected: queueResult.rejected,
        processingTime: Date.now() - startTime
      });

      console.log('✅ [AI COORDINATOR] Cycle complete:', {
        processed: queueResult.processed,
        autoApproved: queueResult.autoApproved,
        efficiency: queueResult.processed > 0 ? (queueResult.autoApproved / queueResult.processed * 100).toFixed(1) + '%' : '0%'
      });

    } catch (error) {
      console.error('❌ [AI COORDINATOR] Cycle processing failed:', error);
    }
  }

  async getSystemStatus(): Promise<{
    isRunning: boolean;
    queueStats: any;
    cacheStats: any;
    performance: any;
  }> {
    const queueStats = await advancedQueueManager.getQueueStats();
    const cacheStats = {
      prediction: predictivePerformanceEngine.getCacheStats(),
      approval: intelligentAutoApproval.getCacheStats()
    };

    // Get recent performance metrics
    const { data: recentMetrics } = await supabase
      .from('ai_learning_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    const performance = recentMetrics?.[0] || {
      total_interactions: 0,
      successful_interactions: 0,
      optimization_triggers: 0,
      average_confidence_score: 0
    };

    return {
      isRunning: this.isRunning,
      queueStats,
      cacheStats,
      performance
    };
  }

  private async storeCycleMetrics(metrics: {
    processed: number;
    autoApproved: number;
    requiresReview: number;
    rejected: number;
    processingTime: number;
  }): Promise<void> {
    try {
      await supabase
        .from('ai_learning_metrics')
        .insert({
          total_interactions: metrics.processed,
          successful_interactions: metrics.autoApproved + metrics.requiresReview,
          optimization_triggers: metrics.autoApproved,
          average_confidence_score: metrics.processed > 0 ? (metrics.autoApproved / metrics.processed) * 100 : 0
        });
    } catch (error) {
      console.error('Failed to store cycle metrics:', error);
    }
  }
}

export const aiAutomationCoordinator = AIAutomationCoordinator.getInstance();