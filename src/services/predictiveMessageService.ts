
interface UserBehaviorPattern {
  conversationId: string;
  accessFrequency: number;
  lastAccessTime: Date;
  averageTimeSpent: number;
  timeOfDayPattern: number[];
  weekdayPattern: boolean[];
}

interface ConversationPrediction {
  conversationId: string;
  leadId: string;
  predictionScore: number;
  reasons: string[];
  shouldPreload: boolean;
}

class PredictiveMessageService {
  private behaviorPatterns = new Map<string, UserBehaviorPattern>();
  private preloadedMessages = new Map<string, any[]>();
  private preloadQueue = new Set<string>();
  private isPreloading = false;

  // Track user behavior for learning
  trackConversationAccess(conversationId: string, leadId: string, timeSpent?: number) {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    const existing = this.behaviorPatterns.get(conversationId) || {
      conversationId,
      accessFrequency: 0,
      lastAccessTime: now,
      averageTimeSpent: 0,
      timeOfDayPattern: new Array(24).fill(0),
      weekdayPattern: new Array(7).fill(false)
    };

    // Update patterns
    existing.accessFrequency += 1;
    existing.lastAccessTime = now;
    existing.timeOfDayPattern[hourOfDay] += 1;
    existing.weekdayPattern[dayOfWeek] = true;

    if (timeSpent) {
      existing.averageTimeSpent = (existing.averageTimeSpent + timeSpent) / 2;
    }

    this.behaviorPatterns.set(conversationId, existing);
    
    console.log('🧠 [PREDICTIVE] Tracked access for conversation:', conversationId);
  }

  // Predict which conversations should be preloaded
  async predictConversationsToPreload(
    conversations: any[], 
    currentTime: Date = new Date()
  ): Promise<ConversationPrediction[]> {
    const predictions: ConversationPrediction[] = [];
    const currentHour = currentTime.getHours();
    const currentDayOfWeek = currentTime.getDay();

    for (const conv of conversations.slice(0, 20)) { // Analyze top 20 conversations
      const pattern = this.behaviorPatterns.get(conv.leadId);
      const reasons: string[] = [];
      let score = 0;

      // Base score from unread messages (high priority)
      if (conv.unreadCount > 0) {
        score += conv.unreadCount * 10;
        reasons.push(`${conv.unreadCount} unread messages`);
      }

      // Recent activity score
      const lastMessageTime = new Date(conv.lastMessageTime);
      const hoursSinceLastMessage = (currentTime.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastMessage < 1) {
        score += 20;
        reasons.push('Very recent activity');
      } else if (hoursSinceLastMessage < 24) {
        score += 10;
        reasons.push('Recent activity');
      }

      // User behavior pattern score
      if (pattern) {
        // Frequency-based score
        if (pattern.accessFrequency > 5) {
          score += Math.min(pattern.accessFrequency, 15);
          reasons.push('Frequently accessed');
        }

        // Time-of-day pattern
        if (pattern.timeOfDayPattern[currentHour] > 0) {
          score += 8;
          reasons.push('Usually accessed at this time');
        }

        // Recent access pattern
        const hoursSinceLastAccess = (currentTime.getTime() - pattern.lastAccessTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastAccess < 6) {
          score += 5;
          reasons.push('Recently accessed');
        }
      }

      // Message direction bonus (incoming messages are higher priority)
      if (conv.lastMessageDirection === 'in') {
        score += 5;
        reasons.push('Incoming message');
      }

      // Lead priority based on stage
      if (conv.aiStage === 'hot_lead' || conv.aiStage === 'ready_to_buy') {
        score += 15;
        reasons.push('High-priority lead');
      }

      predictions.push({
        conversationId: conv.leadId,
        leadId: conv.leadId,
        predictionScore: score,
        reasons,
        shouldPreload: score >= 10 // Threshold for preloading
      });
    }

    // Sort by prediction score
    predictions.sort((a, b) => b.predictionScore - a.predictionScore);
    
    console.log('🎯 [PREDICTIVE] Generated predictions:', predictions.slice(0, 5));
    
    return predictions;
  }

  // Get already preloaded messages
  getPreloadedMessages(leadId: string): any[] | null {
    return this.preloadedMessages.get(leadId) || null;
  }

  // Preload messages for predicted conversations
  async preloadMessages(predictions: ConversationPrediction[], loadMessagesFn: (leadId: string) => Promise<any[]>) {
    if (this.isPreloading) return;

    this.isPreloading = true;
    const toPreload = predictions
      .filter(p => p.shouldPreload && !this.preloadedMessages.has(p.leadId))
      .slice(0, 3); // Limit to top 3 to avoid overwhelming

    console.log('⚡ [PREDICTIVE] Starting preload for:', toPreload.map(p => p.leadId));

    for (const prediction of toPreload) {
      try {
        if (!this.preloadQueue.has(prediction.leadId)) {
          this.preloadQueue.add(prediction.leadId);
          
          // Load messages in background
          const messages = await loadMessagesFn(prediction.leadId);
          this.preloadedMessages.set(prediction.leadId, messages);
          
          console.log(`📦 [PREDICTIVE] Preloaded ${messages.length} messages for lead:`, prediction.leadId);
        }
      } catch (error) {
        console.error('❌ [PREDICTIVE] Preload failed for:', prediction.leadId, error);
      } finally {
        this.preloadQueue.delete(prediction.leadId);
      }
    }

    this.isPreloading = false;
  }

  // Clear old preloaded data
  cleanupPreloadedData(activeConversations: string[]) {
    const toRemove: string[] = [];
    
    for (const [leadId] of this.preloadedMessages) {
      if (!activeConversations.includes(leadId)) {
        toRemove.push(leadId);
      }
    }

    toRemove.forEach(leadId => {
      this.preloadedMessages.delete(leadId);
      console.log('🧹 [PREDICTIVE] Cleaned up preloaded data for:', leadId);
    });
  }

  // Get prediction insights for debugging
  getPredictionInsights(): {
    preloadedCount: number;
    behaviorPatternsCount: number;
    queueSize: number;
    isPreloading: boolean;
  } {
    return {
      preloadedCount: this.preloadedMessages.size,
      behaviorPatternsCount: this.behaviorPatterns.size,
      queueSize: this.preloadQueue.size,
      isPreloading: this.isPreloading
    };
  }
}

export const predictiveMessageService = new PredictiveMessageService();
