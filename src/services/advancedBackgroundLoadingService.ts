
import { ConversationListItem, MessageData } from '@/types/conversation';
import { userActivityMonitor } from './userActivityMonitor';
import { conversationRelationshipEngine } from './conversationRelationshipEngine';
import { resourceManager } from './resourceManager';
import { enhancedPredictiveService } from './enhancedPredictiveService';

interface LoadingJob {
  id: string;
  leadId: string;
  priority: number;
  type: 'urgent' | 'predicted' | 'contextual' | 'opportunistic';
  estimatedSize: number;
  deadline?: Date;
  retryCount: number;
}

interface LoadingQueue {
  urgent: LoadingJob[];
  high: LoadingJob[];
  normal: LoadingJob[];
  low: LoadingJob[];
}

class AdvancedBackgroundLoadingService {
  private isActive = false;
  private loadingQueue: LoadingQueue = {
    urgent: [],
    high: [],
    normal: [],
    low: []
  };
  private activeJobs = new Set<string>();
  private loadedData = new Map<string, MessageData[]>();
  private loadingPromises = new Map<string, Promise<MessageData[]>>();
  private lastActivityTime = Date.now();
  private idleThreshold = 2000; // 2 seconds of inactivity
  private maxConcurrentJobs = 3;
  private totalJobsProcessed = 0;
  private successfulPredictions = 0;

  // Performance tracking
  private performanceMetrics = {
    avgLoadTime: 0,
    cacheHitRate: 0,
    predictionAccuracy: 0,
    networkEfficiency: 0,
    totalLoaded: 0,
    instantAccesses: 0
  };

  constructor() {
    this.startBackgroundWorker();
    this.setupActivityMonitoring();
    this.setupPerformanceTracking();
  }

  // Start the intelligent background worker
  startBackgroundWorker() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🚀 [ADVANCED BG] Starting intelligent background loading service');

    // Main processing loop
    this.processLoadingQueue();
    
    // Periodic optimization
    setInterval(() => this.optimizeAndCleanup(), 30000); // Every 30 seconds
    
    // Adaptive scheduling based on user activity
    setInterval(() => this.scheduleAdaptiveLoading(), 5000); // Every 5 seconds
  }

  // Setup real-time activity monitoring
  private setupActivityMonitoring() {
    userActivityMonitor.onActivity((activity) => {
      this.lastActivityTime = Date.now();
      this.handleUserActivity(activity);
    });

    userActivityMonitor.onIdle(() => {
      console.log('📱 [ADVANCED BG] User idle - increasing background loading');
      this.scheduleOpportunisticLoading();
    });
  }

  // Handle different types of user activity
  private handleUserActivity(activity: any) {
    switch (activity.type) {
      case 'conversation_hover':
        this.scheduleHoverPreloading(activity.leadId);
        break;
      case 'conversation_selection':
        this.schedulePriorityLoading(activity.leadId);
        this.scheduleContextualLoading(activity.leadId);
        break;
      case 'search_query':
        this.scheduleSearchRelatedLoading(activity.query);
        break;
      case 'scroll_activity':
        this.scheduleVisibleConversationsLoading(activity.visibleLeads);
        break;
    }
  }

  // Schedule different types of loading based on priority and context
  scheduleUrgentLoading(leadId: string, reason: string) {
    if (this.isAlreadyLoaded(leadId) || this.isInQueue(leadId)) return;

    const job: LoadingJob = {
      id: `urgent-${leadId}-${Date.now()}`,
      leadId,
      priority: 100,
      type: 'urgent',
      estimatedSize: 50, // KB estimate
      deadline: new Date(Date.now() + 1000), // 1 second deadline
      retryCount: 0
    };

    this.loadingQueue.urgent.push(job);
    console.log(`🚨 [ADVANCED BG] Urgent loading scheduled for ${leadId}: ${reason}`);
    this.processLoadingQueue();
  }

  private scheduleHoverPreloading(leadId: string) {
    if (this.isAlreadyLoaded(leadId) || this.isInQueue(leadId)) return;

    const job: LoadingJob = {
      id: `hover-${leadId}-${Date.now()}`,
      leadId,
      priority: 70,
      type: 'predicted',
      estimatedSize: 30,
      retryCount: 0
    };

    this.loadingQueue.high.push(job);
    console.log(`👆 [ADVANCED BG] Hover preloading scheduled for ${leadId}`);
  }

  private schedulePriorityLoading(leadId: string) {
    enhancedPredictiveService.trackConversationAccess(leadId, leadId);
    
    // Schedule related conversations
    const related = conversationRelationshipEngine.getRelatedConversations(leadId);
    related.slice(0, 2).forEach(relatedId => {
      if (!this.isAlreadyLoaded(relatedId)) {
        this.scheduleContextualLoading(relatedId);
      }
    });
  }

  private scheduleContextualLoading(leadId: string) {
    if (this.isAlreadyLoaded(leadId) || this.isInQueue(leadId)) return;

    const job: LoadingJob = {
      id: `context-${leadId}-${Date.now()}`,
      leadId,
      priority: 60,
      type: 'contextual',
      estimatedSize: 40,
      retryCount: 0
    };

    this.loadingQueue.high.push(job);
    console.log(`🔗 [ADVANCED BG] Contextual loading scheduled for ${leadId}`);
  }

  private scheduleSearchRelatedLoading(query: string) {
    // Use enhanced search to find related conversations
    const related = enhancedPredictiveService.searchConversations(query, 5);
    related.forEach(conv => {
      if (!this.isAlreadyLoaded(conv.leadId)) {
        const job: LoadingJob = {
          id: `search-${conv.leadId}-${Date.now()}`,
          leadId: conv.leadId,
          priority: 50,
          type: 'predicted',
          estimatedSize: 25,
          retryCount: 0
        };
        this.loadingQueue.normal.push(job);
      }
    });
  }

  private scheduleVisibleConversationsLoading(visibleLeads: string[]) {
    visibleLeads.forEach(leadId => {
      if (!this.isAlreadyLoaded(leadId) && !this.isInQueue(leadId)) {
        const job: LoadingJob = {
          id: `visible-${leadId}-${Date.now()}`,
          leadId,
          priority: 40,
          type: 'predicted',
          estimatedSize: 20,
          retryCount: 0
        };
        this.loadingQueue.normal.push(job);
      }
    });
  }

  private scheduleOpportunisticLoading() {
    if (!this.isUserIdle()) return;

    // Get predictions for opportunistic loading
    const predictions = enhancedPredictiveService.getTopPredictions(10);
    predictions.slice(0, 5).forEach(prediction => {
      if (!this.isAlreadyLoaded(prediction.leadId) && prediction.shouldPreload) {
        const job: LoadingJob = {
          id: `opportunistic-${prediction.leadId}-${Date.now()}`,
          leadId: prediction.leadId,
          priority: 20,
          type: 'opportunistic',
          estimatedSize: 15,
          retryCount: 0
        };
        this.loadingQueue.low.push(job);
      }
    });

    console.log(`⏰ [ADVANCED BG] Scheduled ${this.loadingQueue.low.length} opportunistic loading jobs`);
  }

  private scheduleAdaptiveLoading() {
    if (!this.isUserIdle()) return;

    const resources = resourceManager.getResourceStatus();
    if (resources.networkSpeed === 'fast' && resources.cpuUsage < 0.5) {
      // Increase concurrent jobs when resources are available
      this.maxConcurrentJobs = Math.min(6, this.maxConcurrentJobs + 1);
    } else if (resources.networkSpeed === 'slow' || resources.cpuUsage > 0.8) {
      // Decrease concurrent jobs when resources are limited
      this.maxConcurrentJobs = Math.max(1, this.maxConcurrentJobs - 1);
    }

    this.processLoadingQueue();
  }

  // Main queue processing logic
  private async processLoadingQueue() {
    if (this.activeJobs.size >= this.maxConcurrentJobs) return;

    const job = this.getNextJob();
    if (!job) return;

    this.activeJobs.add(job.id);
    
    try {
      console.log(`🔄 [ADVANCED BG] Processing ${job.type} job for ${job.leadId} (priority: ${job.priority})`);
      
      const startTime = Date.now();
      const messages = await this.loadMessages(job.leadId);
      const loadTime = Date.now() - startTime;
      
      this.loadedData.set(job.leadId, messages);
      this.updatePerformanceMetrics(loadTime, messages.length);
      
      console.log(`✅ [ADVANCED BG] Loaded ${messages.length} messages for ${job.leadId} in ${loadTime}ms`);
      
    } catch (error) {
      console.error(`❌ [ADVANCED BG] Failed to load ${job.leadId}:`, error);
      this.handleJobFailure(job);
    } finally {
      this.activeJobs.delete(job.id);
      this.totalJobsProcessed++;
    }

    // Continue processing if there are more jobs
    if (this.hasQueuedJobs()) {
      setTimeout(() => this.processLoadingQueue(), 100);
    }
  }

  private getNextJob(): LoadingJob | null {
    // Process by priority: urgent -> high -> normal -> low
    if (this.loadingQueue.urgent.length > 0) {
      return this.loadingQueue.urgent.shift()!;
    }
    if (this.loadingQueue.high.length > 0) {
      return this.loadingQueue.high.shift()!;
    }
    if (this.loadingQueue.normal.length > 0 && this.isUserIdle()) {
      return this.loadingQueue.normal.shift()!;
    }
    if (this.loadingQueue.low.length > 0 && this.isUserIdle()) {
      return this.loadingQueue.low.shift()!;
    }
    return null;
  }

  private async loadMessages(leadId: string): Promise<MessageData[]> {
    // Use existing promise if already loading
    const existingPromise = this.loadingPromises.get(leadId);
    if (existingPromise) return existingPromise;

    const promise = enhancedPredictiveService.loadMessagesFromDatabase(leadId);
    this.loadingPromises.set(leadId, promise);

    try {
      const messages = await promise;
      return messages;
    } finally {
      this.loadingPromises.delete(leadId);
    }
  }

  private handleJobFailure(job: LoadingJob) {
    job.retryCount++;
    if (job.retryCount < 3) {
      // Retry with lower priority
      job.priority = Math.max(1, job.priority - 20);
      this.loadingQueue.low.push(job);
      console.log(`🔄 [ADVANCED BG] Retrying job ${job.id} (attempt ${job.retryCount})`);
    }
  }

  // Utility methods
  private isAlreadyLoaded(leadId: string): boolean {
    return this.loadedData.has(leadId);
  }

  private isInQueue(leadId: string): boolean {
    const allJobs = [
      ...this.loadingQueue.urgent,
      ...this.loadingQueue.high,
      ...this.loadingQueue.normal,
      ...this.loadingQueue.low
    ];
    return allJobs.some(job => job.leadId === leadId);
  }

  private isUserIdle(): boolean {
    return Date.now() - this.lastActivityTime > this.idleThreshold;
  }

  private hasQueuedJobs(): boolean {
    return this.loadingQueue.urgent.length > 0 ||
           this.loadingQueue.high.length > 0 ||
           this.loadingQueue.normal.length > 0 ||
           this.loadingQueue.low.length > 0;
  }

  private updatePerformanceMetrics(loadTime: number, messageCount: number) {
    this.performanceMetrics.totalLoaded++;
    this.performanceMetrics.avgLoadTime = 
      (this.performanceMetrics.avgLoadTime + loadTime) / 2;
  }

  private optimizeAndCleanup() {
    // Remove old cached data that hasn't been accessed
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [leadId] of this.loadedData) {
      const lastAccess = enhancedPredictiveService.getLastAccessTime(leadId);
      if (lastAccess && lastAccess < oneHourAgo) {
        this.loadedData.delete(leadId);
        console.log(`🧹 [ADVANCED BG] Cleaned up cached data for ${leadId}`);
      }
    }

    // Update performance metrics
    this.calculateCacheHitRate();
    this.calculatePredictionAccuracy();
  }

  private calculateCacheHitRate() {
    const totalAccesses = enhancedPredictiveService.getTotalAccesses();
    if (totalAccesses > 0) {
      this.performanceMetrics.cacheHitRate = 
        this.performanceMetrics.instantAccesses / totalAccesses;
    }
  }

  private calculatePredictionAccuracy() {
    if (this.totalJobsProcessed > 0) {
      this.performanceMetrics.predictionAccuracy = 
        this.successfulPredictions / this.totalJobsProcessed;
    }
  }

  private setupPerformanceTracking() {
    setInterval(() => {
      console.log('📊 [ADVANCED BG] Performance Metrics:', {
        avgLoadTime: `${this.performanceMetrics.avgLoadTime.toFixed(0)}ms`,
        cacheHitRate: `${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`,
        predictionAccuracy: `${(this.performanceMetrics.predictionAccuracy * 100).toFixed(1)}%`,
        totalLoaded: this.performanceMetrics.totalLoaded,
        queueStatus: {
          urgent: this.loadingQueue.urgent.length,
          high: this.loadingQueue.high.length,
          normal: this.loadingQueue.normal.length,
          low: this.loadingQueue.low.length
        },
        activeJobs: this.activeJobs.size,
        maxConcurrent: this.maxConcurrentJobs
      });
    }, 60000); // Log every minute
  }

  // Public API
  getPreloadedMessages(leadId: string): MessageData[] | null {
    const messages = this.loadedData.get(leadId);
    if (messages) {
      this.performanceMetrics.instantAccesses++;
      this.successfulPredictions++;
      console.log(`⚡ [ADVANCED BG] Instant access for ${leadId}!`);
    }
    return messages || null;
  }

  scheduleImmediate(leadId: string) {
    this.scheduleUrgentLoading(leadId, 'user requested');
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  getQueueStatus() {
    return {
      urgent: this.loadingQueue.urgent.length,
      high: this.loadingQueue.high.length,
      normal: this.loadingQueue.normal.length,
      low: this.loadingQueue.low.length,
      activeJobs: this.activeJobs.size,
      totalProcessed: this.totalJobsProcessed
    };
  }

  stop() {
    this.isActive = false;
    console.log('🛑 [ADVANCED BG] Background loading service stopped');
  }
}

export const advancedBackgroundLoadingService = new AdvancedBackgroundLoadingService();
