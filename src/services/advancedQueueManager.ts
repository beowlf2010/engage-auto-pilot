import { supabase } from '@/integrations/supabase/client';
import { intelligentAutoApproval } from './intelligentAutoApproval';

interface QueuedMessage {
  id: string;
  leadId: string;
  messageContent: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  priority: number;
  scheduledFor: Date;
  analysis?: any;
  retryCount: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'failed';
}

interface BatchProcessingResult {
  processed: number;
  autoApproved: number;
  requiresReview: number;
  rejected: number;
  failed: number;
  performance: {
    avgProcessingTime: number;
    totalTime: number;
  };
}

export class AdvancedQueueManager {
  private static instance: AdvancedQueueManager;
  private processingQueue = new Map<string, QueuedMessage>();
  private isProcessing = false;
  private batchSize = 10;
  private maxConcurrentProcessing = 5;

  static getInstance(): AdvancedQueueManager {
    if (!AdvancedQueueManager.instance) {
      AdvancedQueueManager.instance = new AdvancedQueueManager();
    }
    return AdvancedQueueManager.instance;
  }

  async processQueue(): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      console.log('🔄 [QUEUE MANAGER] Already processing queue');
      return this.getEmptyResult();
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log('🚀 [QUEUE MANAGER] Starting queue processing...');

      // Load pending messages from database
      const pendingMessages = await this.loadPendingMessages();
      
      if (pendingMessages.length === 0) {
        console.log('📭 [QUEUE MANAGER] No pending messages to process');
        return this.getEmptyResult();
      }

      // Priority sort messages
      const prioritizedMessages = await this.prioritizeMessages(pendingMessages);
      
      // Process in batches
      const batches = this.createBatches(prioritizedMessages, this.batchSize);
      
      let totalProcessed = 0;
      let totalAutoApproved = 0;
      let totalRequiresReview = 0;
      let totalRejected = 0;
      let totalFailed = 0;

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch);
        
        totalProcessed += batchResult.processed;
        totalAutoApproved += batchResult.autoApproved;
        totalRequiresReview += batchResult.requiresReview;
        totalRejected += batchResult.rejected;
        totalFailed += batchResult.failed;

        // Small delay between batches to prevent overload
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const totalTime = Date.now() - startTime;
      const avgProcessingTime = totalProcessed > 0 ? totalTime / totalProcessed : 0;

      const result: BatchProcessingResult = {
        processed: totalProcessed,
        autoApproved: totalAutoApproved,
        requiresReview: totalRequiresReview,
        rejected: totalRejected,
        failed: totalFailed,
        performance: {
          avgProcessingTime,
          totalTime
        }
      };

      console.log('✅ [QUEUE MANAGER] Queue processing complete:', result);
      
      // Store performance metrics
      await this.storePerformanceMetrics(result);

      return result;

    } catch (error) {
      console.error('❌ [QUEUE MANAGER] Queue processing failed:', error);
      return this.getEmptyResult();
    } finally {
      this.isProcessing = false;
    }
  }

  private async loadPendingMessages(): Promise<QueuedMessage[]> {
    const { data: messages } = await supabase
      .from('ai_trigger_messages')
      .select(`
        id,
        lead_id,
        message_content,
        urgency_level,
        generated_at,
        approved,
        leads!inner(first_name, last_name, ai_stage, vehicle_interest)
      `)
      .eq('approved', false)
      .is('sent_at', null)
      .order('generated_at', { ascending: true })
      .limit(100);

    if (!messages) return [];

    return messages.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      messageContent: msg.message_content,
      urgencyLevel: msg.urgency_level as 'low' | 'medium' | 'high',
      priority: this.calculateBasePriority(msg.urgency_level),
      scheduledFor: new Date(msg.generated_at),
      retryCount: 0,
      status: 'pending' as const
    }));
  }

  private async prioritizeMessages(messages: QueuedMessage[]): Promise<QueuedMessage[]> {
    console.log('🎯 [QUEUE MANAGER] Prioritizing messages...');

    // Enhanced prioritization with multiple factors
    const enhancedMessages = await Promise.all(
      messages.map(async (message) => {
        const priority = await this.calculateEnhancedPriority(message);
        return { ...message, priority };
      })
    );

    // Sort by priority (highest first)
    return enhancedMessages.sort((a, b) => b.priority - a.priority);
  }

  private async calculateEnhancedPriority(message: QueuedMessage): Promise<number> {
    let priority = message.priority; // Base priority from urgency

    try {
      // Get lead data for priority calculation
      const { data: lead } = await supabase
        .from('leads')
        .select('last_reply_at, ai_stage, created_at')
        .eq('id', message.leadId)
        .single();

      if (lead) {
        // Recent activity boost
        const hoursSinceReply = lead.last_reply_at 
          ? (Date.now() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60)
          : 168;

        if (hoursSinceReply < 4) {
          priority += 30; // Very recent activity
        } else if (hoursSinceReply < 24) {
          priority += 20; // Recent activity
        } else if (hoursSinceReply > 168) {
          priority -= 10; // Old lead
        }

        // Stage priority
        switch (lead.ai_stage) {
          case 'hot':
            priority += 25;
            break;
          case 'warm':
            priority += 15;
            break;
          case 'follow_up':
            priority += 10;
            break;
          case 'cold':
            priority -= 5;
            break;
        }
      }

      // Check for conversation activity
      const { data: recentConversations } = await supabase
        .from('conversations')
        .select('direction, sent_at')
        .eq('lead_id', message.leadId)
        .gte('sent_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false });

      if (recentConversations && recentConversations.length > 0) {
        const hasRecentInbound = recentConversations.some(c => c.direction === 'in');
        if (hasRecentInbound) {
          priority += 20; // Recent customer engagement
        }
      }

      // Message age factor
      const messageAge = Date.now() - message.scheduledFor.getTime();
      if (messageAge > 60 * 60 * 1000) { // More than 1 hour old
        priority += Math.min(15, messageAge / (60 * 60 * 1000) * 2);
      }

    } catch (error) {
      console.error('Error calculating enhanced priority:', error);
    }

    return Math.max(0, Math.min(100, priority));
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(batch: QueuedMessage[]): Promise<BatchProcessingResult> {
    console.log(`📦 [QUEUE MANAGER] Processing batch of ${batch.length} messages`);

    const results = await Promise.allSettled(
      batch.map(message => this.processMessage(message))
    );

    let processed = 0;
    let autoApproved = 0;
    let requiresReview = 0;
    let rejected = 0;
    let failed = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        processed++;
        switch (result.value.recommendation) {
          case 'auto_approve':
            autoApproved++;
            break;
          case 'review_required':
            requiresReview++;
            break;
          case 'reject':
            rejected++;
            break;
          default:
            requiresReview++;
        }
      } else {
        failed++;
        console.error(`Message ${batch[index].id} failed:`, result.reason);
      }
    });

    return {
      processed,
      autoApproved,
      requiresReview,
      rejected,
      failed,
      performance: {
        avgProcessingTime: 0,
        totalTime: 0
      }
    };
  }

  private async processMessage(message: QueuedMessage): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [QUEUE MANAGER] Processing message ${message.id} for lead ${message.leadId}`);

      // Use intelligent auto-approval engine
      const analysis = await intelligentAutoApproval.analyzeMessageForAutoApproval(
        message.messageContent,
        message.leadId,
        message.urgencyLevel
      );

      // Update message status based on recommendation
      await this.updateMessageStatus(message.id, analysis);

      // Auto-approve if recommended and confidence is high
      if (analysis.recommendation === 'auto_approve' && analysis.confidenceLevel >= 80) {
        await this.autoApproveMessage(message.id);
        console.log(`✅ [QUEUE MANAGER] Auto-approved message ${message.id}`);
      }

      const processingTime = Date.now() - startTime;
      console.log(`⏱️ [QUEUE MANAGER] Message ${message.id} processed in ${processingTime}ms`);

      return analysis;

    } catch (error) {
      console.error(`❌ [QUEUE MANAGER] Failed to process message ${message.id}:`, error);
      
      // Mark as failed in database
      await supabase
        .from('ai_trigger_messages')
        .update({ 
          urgency_level: 'low' // Downgrade failed messages
        })
        .eq('id', message.id);

      throw error;
    }
  }

  private async updateMessageStatus(messageId: string, analysis: any): Promise<void> {
    try {
      // Store the analysis in quality scores table
      await supabase
        .from('ai_quality_scores')
        .insert({
          message_id: messageId,
          overall_score: analysis.overallScore,
          relevance_score: analysis.leadCompatibility,
          personalization_score: analysis.contentQuality,
          tone_appropriateness_score: analysis.timingScore,
          compliance_score: 100 - analysis.riskAssessment,
          approved_for_sending: analysis.recommendation === 'auto_approve',
          quality_factors: {
            template_score: analysis.templateScore,
            confidence_level: analysis.confidenceLevel,
            recommendation: analysis.recommendation,
            reasoning: analysis.reasoning
          },
          lead_id: await this.getLeadIdFromMessage(messageId),
          message_content: await this.getMessageContent(messageId)
        });

    } catch (error) {
      console.error('Failed to update message status:', error);
    }
  }

  private async autoApproveMessage(messageId: string): Promise<void> {
    await supabase
      .from('ai_trigger_messages')
      .update({ 
        approved: true
      })
      .eq('id', messageId);
  }

  private async getLeadIdFromMessage(messageId: string): Promise<string> {
    const { data } = await supabase
      .from('ai_trigger_messages')
      .select('lead_id')
      .eq('id', messageId)
      .single();
    
    return data?.lead_id || '';
  }

  private async getMessageContent(messageId: string): Promise<string> {
    const { data } = await supabase
      .from('ai_trigger_messages')
      .select('message_content')
      .eq('id', messageId)
      .single();
    
    return data?.message_content || '';
  }

  private calculateBasePriority(urgencyLevel: string): number {
    switch (urgencyLevel) {
      case 'high': return 80;
      case 'medium': return 50;
      case 'low': return 20;
      default: return 30;
    }
  }

  private async storePerformanceMetrics(result: BatchProcessingResult): Promise<void> {
    try {
      await supabase
        .from('ai_learning_metrics')
        .insert({
          total_interactions: result.processed,
          successful_interactions: result.autoApproved + result.requiresReview,
          optimization_triggers: result.autoApproved,
          average_confidence_score: result.processed > 0 ? 
            (result.autoApproved * 90 + result.requiresReview * 70) / result.processed : 0
        });
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
  }

  private getEmptyResult(): BatchProcessingResult {
    return {
      processed: 0,
      autoApproved: 0,
      requiresReview: 0,
      rejected: 0,
      failed: 0,
      performance: {
        avgProcessingTime: 0,
        totalTime: 0
      }
    };
  }

  // Real-time monitoring methods
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    autoApprovalRate: number;
    avgProcessingTime: number;
  }> {
    const { data: pending } = await supabase
      .from('ai_trigger_messages')
      .select('id')
      .eq('approved', false)
      .is('sent_at', null);

    const { data: recentMetrics } = await supabase
      .from('ai_learning_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const autoApprovalRate = recentMetrics && recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + (m.optimization_triggers || 0), 0) /
        recentMetrics.reduce((sum, m) => sum + (m.total_interactions || 1), 0) * 100
      : 0;

    return {
      pending: pending?.length || 0,
      processing: this.processingQueue.size,
      autoApprovalRate,
      avgProcessingTime: 0 // Would be calculated from recent performance data
    };
  }

  // Configuration methods
  setBatchSize(size: number): void {
    this.batchSize = Math.max(1, Math.min(50, size));
  }

  setMaxConcurrentProcessing(max: number): void {
    this.maxConcurrentProcessing = Math.max(1, Math.min(20, max));
  }

  getConfiguration(): { batchSize: number; maxConcurrentProcessing: number } {
    return {
      batchSize: this.batchSize,
      maxConcurrentProcessing: this.maxConcurrentProcessing
    };
  }
}

export const advancedQueueManager = AdvancedQueueManager.getInstance();