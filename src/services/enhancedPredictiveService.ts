import { ConversationListItem, MessageData } from '@/types/conversation';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedUserBehaviorPattern {
  conversationId: string;
  accessFrequency: number;
  lastAccessTime: Date;
  averageTimeSpent: number;
  timeOfDayPattern: number[];
  weekdayPattern: boolean[];
  sequencePatterns: string[][];
  contextualAccesses: Array<{
    fromLeadId: string;
    toLeadId: string;
    timestamp: Date;
  }>;
  searchContexts: string[];
  deviceUsagePattern: Record<string, number>;
}

interface EnhancedConversationPrediction {
  conversationId: string;
  leadId: string;
  predictionScore: number;
  confidenceLevel: number;
  reasons: string[];
  shouldPreload: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedAccessTime?: Date;
  relatedConversations: string[];
}

interface MLFeatures {
  timeBasedScore: number;
  behaviorScore: number;
  contextScore: number;
  urgencyScore: number;
  relationshipScore: number;
}

class EnhancedPredictiveService {
  private behaviorPatterns = new Map<string, AdvancedUserBehaviorPattern>();
  private conversationCache = new Map<string, ConversationListItem>();
  private accessHistory: Array<{ leadId: string; timestamp: Date; sessionId: string }> = [];
  private currentSessionId = this.generateSessionId();
  private searchIndex = new Map<string, any>();
  private mlModel = new Map<string, number>(); // Simple ML weights
  private totalAccesses = 0;
  private lastAccessTimes = new Map<string, number>();

  constructor() {
    this.initializeMLModel();
    this.setupSessionTracking();
  }

  private initializeMLModel() {
    // Initialize simple ML model weights
    this.mlModel.set('time_recency_weight', 0.25);
    this.mlModel.set('frequency_weight', 0.20);
    this.mlModel.set('sequence_weight', 0.15);
    this.mlModel.set('context_weight', 0.15);
    this.mlModel.set('urgency_weight', 0.25);

    console.log('🧠 [ENHANCED PREDICTIVE] ML model initialized');
  }

  private setupSessionTracking() {
    // Track session changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.currentSessionId = this.generateSessionId();
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Enhanced behavior tracking with ML features
  trackConversationAccess(conversationId: string, leadId: string, timeSpent?: number, context?: any) {
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    this.totalAccesses++;
    this.lastAccessTimes.set(leadId, now.getTime());

    // Add to access history
    this.accessHistory.push({
      leadId,
      timestamp: now,
      sessionId: this.currentSessionId
    });

    // Keep only recent history (last 1000 accesses)
    if (this.accessHistory.length > 1000) {
      this.accessHistory.shift();
    }

    const existing = this.behaviorPatterns.get(conversationId) || {
      conversationId,
      accessFrequency: 0,
      lastAccessTime: now,
      averageTimeSpent: 0,
      timeOfDayPattern: new Array(24).fill(0),
      weekdayPattern: new Array(7).fill(false),
      sequencePatterns: [],
      contextualAccesses: [],
      searchContexts: [],
      deviceUsagePattern: {}
    };

    // Update patterns with enhanced tracking
    existing.accessFrequency += 1;
    existing.lastAccessTime = now;
    existing.timeOfDayPattern[hourOfDay] += 1;
    existing.weekdayPattern[dayOfWeek] = true;

    if (timeSpent) {
      existing.averageTimeSpent = existing.averageTimeSpent > 0 
        ? (existing.averageTimeSpent + timeSpent) / 2 
        : timeSpent;
    }

    // Track device usage
    const deviceType = this.getDeviceType();
    existing.deviceUsagePattern[deviceType] = (existing.deviceUsagePattern[deviceType] || 0) + 1;

    // Track contextual access patterns
    if (context?.fromLeadId) {
      existing.contextualAccesses.push({
        fromLeadId: context.fromLeadId,
        toLeadId: leadId,
        timestamp: now
      });

      // Keep only recent contextual accesses
      if (existing.contextualAccesses.length > 50) {
        existing.contextualAccesses.shift();
      }
    }

    // Track search contexts
    if (context?.searchQuery) {
      existing.searchContexts.push(context.searchQuery);
      if (existing.searchContexts.length > 20) {
        existing.searchContexts.shift();
      }
    }

    this.behaviorPatterns.set(conversationId, existing);

    // Update sequence patterns
    this.updateSequencePatterns(leadId);

    // Adapt ML model based on access patterns
    this.adaptMLModel();

    console.log('🧠 [ENHANCED PREDICTIVE] Enhanced tracking for:', conversationId);
  }

  private updateSequencePatterns(currentLeadId: string) {
    // Get recent accesses in current session
    const sessionAccesses = this.accessHistory
      .filter(access => access.sessionId === this.currentSessionId)
      .slice(-10) // Last 10 accesses
      .map(access => access.leadId);

    if (sessionAccesses.length >= 2) {
      const pattern = this.behaviorPatterns.get(currentLeadId);
      if (pattern) {
        pattern.sequencePatterns.push([...sessionAccesses]);
        
        // Keep only recent patterns
        if (pattern.sequencePatterns.length > 20) {
          pattern.sequencePatterns.shift();
        }
      }
    }
  }

  private adaptMLModel() {
    // Simple adaptive learning based on access patterns
    const recentAccesses = this.accessHistory.slice(-100);
    
    if (recentAccesses.length >= 50) {
      // Analyze patterns and adjust weights
      const timeBasedAccuracy = this.calculateTimeBasedAccuracy(recentAccesses);
      const sequenceAccuracy = this.calculateSequenceAccuracy(recentAccesses);
      
      // Adjust weights based on accuracy
      if (timeBasedAccuracy > 0.7) {
        this.mlModel.set('time_recency_weight', 0.30);
      }
      
      if (sequenceAccuracy > 0.6) {
        this.mlModel.set('sequence_weight', 0.20);
      }
      
      console.log('🔧 [ENHANCED PREDICTIVE] ML model adapted based on patterns');
    }
  }

  private calculateTimeBasedAccuracy(accesses: typeof this.accessHistory): number {
    // Simple accuracy calculation based on time patterns
    const hourCounts = new Array(24).fill(0);
    accesses.forEach(access => {
      hourCounts[access.timestamp.getHours()]++;
    });
    
    const totalAccesses = accesses.length;
    const maxHourCount = Math.max(...hourCounts);
    
    return maxHourCount / totalAccesses;
  }

  private calculateSequenceAccuracy(accesses: typeof this.accessHistory): number {
    // Calculate how often sequences repeat
    const sequences = [];
    for (let i = 0; i < accesses.length - 1; i++) {
      sequences.push([accesses[i].leadId, accesses[i + 1].leadId]);
    }
    
    const sequenceMap = new Map<string, number>();
    sequences.forEach(seq => {
      const key = seq.join('-');
      sequenceMap.set(key, (sequenceMap.get(key) || 0) + 1);
    });
    
    const repeatedSequences = Array.from(sequenceMap.values()).filter(count => count > 1).length;
    return repeatedSequences / sequences.length;
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  // Enhanced prediction with ML features
  async predictConversationsToPreload(
    conversations: ConversationListItem[], 
    currentTime: Date = new Date(),
    context?: { currentLeadId?: string; searchQuery?: string }
  ): Promise<EnhancedConversationPrediction[]> {
    console.log('🎯 [ENHANCED PREDICTIVE] Generating enhanced predictions...');

    const predictions: EnhancedConversationPrediction[] = [];

    // Update conversation cache
    conversations.forEach(conv => {
      this.conversationCache.set(conv.leadId, conv);
    });

    for (const conv of conversations.slice(0, 30)) { // Analyze top 30
      const features = await this.extractMLFeatures(conv, currentTime, context);
      const prediction = this.generatePrediction(conv, features, currentTime);
      predictions.push(prediction);
    }

    // Sort by prediction score and confidence
    predictions.sort((a, b) => {
      if (a.confidenceLevel !== b.confidenceLevel) {
        return b.confidenceLevel - a.confidenceLevel;
      }
      return b.predictionScore - a.predictionScore;
    });

    console.log('🎯 [ENHANCED PREDICTIVE] Generated', predictions.length, 'enhanced predictions');
    return predictions;
  }

  private async extractMLFeatures(
    conv: ConversationListItem, 
    currentTime: Date, 
    context?: any
  ): Promise<MLFeatures> {
    const pattern = this.behaviorPatterns.get(conv.leadId);
    const currentHour = currentTime.getHours();
    const currentDayOfWeek = currentTime.getDay();

    // Time-based scoring
    let timeBasedScore = 0;
    const lastMessageTime = new Date(conv.lastMessageTime);
    const hoursSinceLastMessage = (currentTime.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastMessage < 1) timeBasedScore += 30;
    else if (hoursSinceLastMessage < 6) timeBasedScore += 20;
    else if (hoursSinceLastMessage < 24) timeBasedScore += 10;

    // Add time-of-day pattern scoring
    if (pattern?.timeOfDayPattern[currentHour] > 0) {
      timeBasedScore += 15;
    }

    // Behavior-based scoring
    let behaviorScore = 0;
    if (pattern) {
      behaviorScore += Math.min(pattern.accessFrequency * 2, 20);
      
      const hoursSinceLastAccess = (currentTime.getTime() - pattern.lastAccessTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAccess < 6) behaviorScore += 10;
      
      if (pattern.averageTimeSpent > 5000) behaviorScore += 8; // Long engagement
    }

    // Context-based scoring
    let contextScore = 0;
    if (context?.currentLeadId && pattern) {
      // Check if this conversation is often accessed after current one
      const contextualAccesses = pattern.contextualAccesses.filter(
        access => access.fromLeadId === context.currentLeadId
      );
      contextScore += Math.min(contextualAccesses.length * 5, 15);
    }

    if (context?.searchQuery && pattern) {
      // Check if conversation matches search context
      const matchingSearches = pattern.searchContexts.filter(
        search => search.toLowerCase().includes(context.searchQuery.toLowerCase())
      );
      contextScore += Math.min(matchingSearches.length * 3, 10);
    }

    // Urgency-based scoring
    let urgencyScore = 0;
    urgencyScore += conv.unreadCount * 8;
    if (conv.lastMessageDirection === 'in') urgencyScore += 12;
    if (conv.aiStage === 'hot_lead') urgencyScore += 15;
    if (conv.aiStage === 'ready_to_buy') urgencyScore += 20;

    // Relationship scoring
    let relationshipScore = 0;
    if (pattern?.sequencePatterns.length > 0) {
      // Check if this conversation appears in common sequences
      const sequenceMatches = pattern.sequencePatterns.filter(seq => 
        seq.includes(conv.leadId)
      ).length;
      relationshipScore += Math.min(sequenceMatches * 3, 12);
    }

    return {
      timeBasedScore,
      behaviorScore,
      contextScore,
      urgencyScore,
      relationshipScore
    };
  }

  private generatePrediction(
    conv: ConversationListItem, 
    features: MLFeatures, 
    currentTime: Date
  ): EnhancedConversationPrediction {
    // Apply ML model weights
    const weightedScore = 
      features.timeBasedScore * this.mlModel.get('time_recency_weight')! +
      features.behaviorScore * this.mlModel.get('frequency_weight')! +
      features.contextScore * this.mlModel.get('context_weight')! +
      features.urgencyScore * this.mlModel.get('urgency_weight')! +
      features.relationshipScore * this.mlModel.get('sequence_weight')!;

    // Calculate confidence level
    const maxPossibleScore = 100;
    const normalizedScore = Math.min(weightedScore, maxPossibleScore);
    const confidenceLevel = normalizedScore / maxPossibleScore;

    // Determine priority
    let priority: 'urgent' | 'high' | 'medium' | 'low';
    if (normalizedScore >= 80) priority = 'urgent';
    else if (normalizedScore >= 60) priority = 'high';
    else if (normalizedScore >= 30) priority = 'medium';
    else priority = 'low';

    // Generate reasons
    const reasons: string[] = [];
    if (features.urgencyScore > 15) reasons.push('High urgency (unread messages)');
    if (features.timeBasedScore > 20) reasons.push('Recent activity');
    if (features.behaviorScore > 15) reasons.push('Frequent access pattern');
    if (features.contextScore > 10) reasons.push('Contextual relevance');
    if (features.relationshipScore > 8) reasons.push('Sequential access pattern');

    // Estimate access time
    let estimatedAccessTime: Date | undefined;
    const pattern = this.behaviorPatterns.get(conv.leadId);
    if (pattern && pattern.timeOfDayPattern.length > 0) {
      const mostActiveHour = pattern.timeOfDayPattern.indexOf(Math.max(...pattern.timeOfDayPattern));
      if (mostActiveHour !== -1) {
        estimatedAccessTime = new Date(currentTime);
        estimatedAccessTime.setHours(mostActiveHour, 0, 0, 0);
        if (estimatedAccessTime <= currentTime) {
          estimatedAccessTime.setDate(estimatedAccessTime.getDate() + 1);
        }
      }
    }

    // Find related conversations
    const relatedConversations = this.findRelatedConversations(conv.leadId, 3);

    return {
      conversationId: conv.leadId,
      leadId: conv.leadId,
      predictionScore: normalizedScore,
      confidenceLevel,
      reasons,
      shouldPreload: normalizedScore >= 25 && confidenceLevel >= 0.3,
      priority,
      estimatedAccessTime,
      relatedConversations
    };
  }

  private findRelatedConversations(leadId: string, maxResults: number): string[] {
    const pattern = this.behaviorPatterns.get(leadId);
    if (!pattern) return [];

    const related = new Set<string>();

    // From sequence patterns
    pattern.sequencePatterns.forEach(sequence => {
      const index = sequence.indexOf(leadId);
      if (index !== -1) {
        if (index > 0) related.add(sequence[index - 1]);
        if (index < sequence.length - 1) related.add(sequence[index + 1]);
      }
    });

    // From contextual accesses
    pattern.contextualAccesses.forEach(access => {
      if (access.toLeadId === leadId) {
        related.add(access.fromLeadId);
      }
    });

    return Array.from(related).slice(0, maxResults);
  }

  // Enhanced search with ML-powered relevance
  searchConversations(query: string, limit = 10): ConversationListItem[] {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const results: Array<{ conversation: ConversationListItem; score: number }> = [];

    for (const [leadId, item] of this.searchIndex) {
      const conversation = item.conversation as ConversationListItem;
      let score = 0;

      // Basic text matching
      if (item.searchableText.includes(searchTerm)) {
        score += 10;
      }

      // Enhanced scoring based on user behavior
      const pattern = this.behaviorPatterns.get(leadId);
      if (pattern) {
        // Boost frequently accessed conversations
        score += Math.min(pattern.accessFrequency, 5);

        // Boost recent accesses
        const hoursSinceLastAccess = (Date.now() - pattern.lastAccessTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastAccess < 24) score += 3;

        // Boost if query matches previous search contexts
        const searchMatches = pattern.searchContexts.filter(
          search => search.toLowerCase().includes(searchTerm)
        ).length;
        score += Math.min(searchMatches * 2, 6);
      }

      // Boost unread conversations
      score += conversation.unreadCount * 2;

      // Boost recent messages
      const lastMessageTime = new Date(conversation.lastMessageTime);
      const hoursSinceLastMessage = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage < 24) score += 2;

      if (score > 0) {
        results.push({ conversation, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.conversation);
  }

  // Database loading function
  async loadMessagesFromDatabase(leadId: string): Promise<MessageData[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    return data.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      body: msg.body,
      direction: msg.direction as 'in' | 'out',
      sentAt: msg.sent_at,
      readAt: msg.read_at,
      smsStatus: msg.sms_status || 'delivered',
      aiGenerated: msg.ai_generated || false,
      smsError: msg.sms_error
    }));
  }

  // Update search index
  updateSearchIndex(conversations: ConversationListItem[]) {
    conversations.forEach(conv => {
      const searchableText = [
        conv.leadName,
        conv.primaryPhone,
        conv.vehicleInterest,
        conv.lastMessage,
        conv.leadSource
      ].filter(Boolean).join(' ').toLowerCase();

      this.searchIndex.set(conv.leadId, {
        conversation: conv,
        searchableText
      });
    });
  }

  // Get top predictions for opportunistic loading
  getTopPredictions(limit: number = 10): EnhancedConversationPrediction[] {
    const conversations = Array.from(this.conversationCache.values());
    return this.predictConversationsToPreload(conversations, new Date())
      .then(predictions => predictions.slice(0, limit))
      .catch(error => {
        console.error('Error getting top predictions:', error);
        return [];
      }) as any; // Temporary type assertion
  }

  // Get performance insights
  getTotalAccesses(): number {
    return this.totalAccesses;
  }

  getLastAccessTime(leadId: string): number | undefined {
    return this.lastAccessTimes.get(leadId);
  }

  getPredictionInsights() {
    return {
      totalConversations: this.conversationCache.size,
      behaviorPatternsTracked: this.behaviorPatterns.size,
      accessHistoryLength: this.accessHistory.length,
      totalAccesses: this.totalAccesses,
      mlModelWeights: Object.fromEntries(this.mlModel),
      currentSessionId: this.currentSessionId
    };
  }
}

export const enhancedPredictiveService = new EnhancedPredictiveService();
