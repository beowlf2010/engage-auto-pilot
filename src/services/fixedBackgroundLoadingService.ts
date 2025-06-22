
import { MessageData } from '@/types/conversation';
import { enhancedPredictiveService } from './enhancedPredictiveService';
import { messageCacheService } from './messageCacheService';

export interface LoadingJob {
  leadId: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  timestamp: number;
  retries: number;
}

class FixedBackgroundLoadingService {
  private queue: LoadingJob[] = [];
  private isProcessing = false;
  private activeJobs = new Set<string>();
  private preloadedMessages = new Map<string, MessageData[]>();
  private maxConcurrent = 3;
  private loadTimes: number[] = [];

  scheduleImmediate(leadId: string, priority: 'urgent' | 'high' | 'normal' | 'low' = 'high') {
    if (this.activeJobs.has(leadId) || this.preloadedMessages.has(leadId)) {
      console.log(`⏩ [FIXED BG] Lead ${leadId} already processing or preloaded`);
      return;
    }

    const existingIndex = this.queue.findIndex(job => job.leadId === leadId);
    if (existingIndex !== -1) {
      this.queue[existingIndex].priority = priority;
      this.queue[existingIndex].timestamp = Date.now();
    } else {
      this.queue.push({
        leadId,
        priority,
        timestamp: Date.now(),
        retries: 0
      });
    }

    this.sortQueue();
    this.processQueue();
  }

  private sortQueue() {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.activeJobs.size >= this.maxConcurrent) return;
    
    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrent) {
      const job = this.queue.shift();
      if (!job) break;

      if (this.activeJobs.has(job.leadId) || this.preloadedMessages.has(job.leadId)) {
        continue;
      }

      this.activeJobs.add(job.leadId);
      this.loadMessages(job).catch(error => {
        console.error(`❌ [FIXED BG] Error loading messages for ${job.leadId}:`, error);
      }).finally(() => {
        this.activeJobs.delete(job.leadId);
      });
    }

    this.isProcessing = false;
  }

  private async loadMessages(job: LoadingJob) {
    const startTime = Date.now();
    
    try {
      console.log(`📦 [FIXED BG] Loading messages for lead: ${job.leadId}`);
      
      const messages = await enhancedPredictiveService.loadMessagesFromDatabase(job.leadId);
      
      if (messages && Array.isArray(messages)) {
        this.preloadedMessages.set(job.leadId, messages);
        messageCacheService.cacheMessages(job.leadId, messages);
        
        const loadTime = Date.now() - startTime;
        this.loadTimes.push(loadTime);
        
        console.log(`✅ [FIXED BG] Preloaded ${messages.length} messages for ${job.leadId} in ${loadTime}ms`);
      }
    } catch (error) {
      console.error(`❌ [FIXED BG] Failed to load messages for ${job.leadId}:`, error);
      
      if (job.retries < 2) {
        job.retries++;
        this.queue.push(job);
        this.sortQueue();
      }
    }
  }

  getPreloadedMessages(leadId: string): MessageData[] | null {
    const messages = this.preloadedMessages.get(leadId);
    if (messages) {
      this.preloadedMessages.delete(leadId);
      return messages;
    }
    return null;
  }

  getPerformanceMetrics() {
    const avgLoadTime = this.loadTimes.length > 0 
      ? Math.round(this.loadTimes.reduce((sum, time) => sum + time, 0) / this.loadTimes.length)
      : 0;

    return {
      avgLoadTime: `${avgLoadTime}ms`,
      cacheHitRate: "0.0%",
      predictionAccuracy: "0.0%",
      totalLoaded: this.loadTimes.length,
      queueStatus: this.getQueueStatus(),
      activeJobs: this.activeJobs.size,
      maxConcurrent: this.maxConcurrent
    };
  }

  getQueueStatus() {
    const status = { urgent: 0, high: 0, normal: 0, low: 0 };
    this.queue.forEach(job => {
      status[job.priority]++;
    });
    return status;
  }

  stop() {
    this.queue = [];
    this.activeJobs.clear();
    this.preloadedMessages.clear();
    console.log('🛑 [FIXED BG] Background loading service stopped');
  }
}

export const fixedBackgroundLoadingService = new FixedBackgroundLoadingService();
