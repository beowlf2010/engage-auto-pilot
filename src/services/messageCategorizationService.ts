interface MessageCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  patterns: RegExp[];
  priority: number;
  color: string;
  icon: string;
}

interface CategorizationResult {
  messageId: string;
  categories: string[];
  confidence: number;
  primaryCategory: string;
  tags: string[];
  intent: string;
  sentiment: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  suggestedResponse?: string;
}

interface CategoryAnalytics {
  totalMessages: number;
  categoryDistribution: Map<string, number>;
  avgConfidence: number;
  accuracyRate: number;
  trendsOverTime: Array<{
    date: Date;
    categories: Record<string, number>;
  }>;
}

class MessageCategorizationService {
  private categories: Map<string, MessageCategory> = new Map();
  private categorizationCache = new Map<string, CategorizationResult>();
  private analytics: CategoryAnalytics = {
    totalMessages: 0,
    categoryDistribution: new Map(),
    avgConfidence: 0,
    accuracyRate: 0.95,
    trendsOverTime: []
  };

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories() {
    const defaultCategories: MessageCategory[] = [
      {
        id: 'pricing_inquiry',
        name: 'Pricing Inquiry',
        description: 'Questions about vehicle pricing, payments, or financing',
        keywords: ['price', 'cost', 'payment', 'financing', 'monthly', 'down payment', 'lease', 'finance'],
        patterns: [/how much/i, /what.*cost/i, /price.*for/i, /monthly payment/i],
        priority: 8,
        color: '#10B981',
        icon: '💰'
      },
      {
        id: 'appointment_request',
        name: 'Appointment Request',
        description: 'Scheduling or appointment-related messages',
        keywords: ['appointment', 'schedule', 'meet', 'visit', 'when', 'available', 'time'],
        patterns: [/schedule.*appointment/i, /when.*available/i, /meet.*you/i, /come.*see/i],
        priority: 9,
        color: '#3B82F6',
        icon: '📅'
      },
      {
        id: 'vehicle_inquiry',
        name: 'Vehicle Inquiry',
        description: 'Questions about specific vehicles or inventory',
        keywords: ['vehicle', 'car', 'truck', 'suv', 'available', 'inventory', 'options', 'features'],
        patterns: [/do you have/i, /available.*vehicles/i, /looking for/i, /interested in/i],
        priority: 7,
        color: '#8B5CF6',
        icon: '🚗'
      },
      {
        id: 'trade_inquiry',
        name: 'Trade-in Inquiry',
        description: 'Trade-in value or process questions',
        keywords: ['trade', 'trade-in', 'current car', 'my vehicle', 'worth', 'value'],
        patterns: [/trade.*in/i, /my current/i, /worth.*car/i, /value.*vehicle/i],
        priority: 6,
        color: '#F59E0B',
        icon: '🔄'
      },
      {
        id: 'service_support',
        name: 'Service & Support',
        description: 'Service, warranty, or technical support questions',
        keywords: ['service', 'repair', 'warranty', 'maintenance', 'problem', 'issue'],
        patterns: [/service.*appointment/i, /warranty.*question/i, /problem.*with/i],
        priority: 8,
        color: '#EF4444',
        icon: '🔧'
      },
      {
        id: 'general_interest',
        name: 'General Interest',
        description: 'General inquiries or initial contact',
        keywords: ['hello', 'hi', 'interested', 'information', 'details', 'tell me'],
        patterns: [/tell me.*about/i, /interested.*in/i, /more information/i],
        priority: 4,
        color: '#6B7280',
        icon: '💬'
      },
      {
        id: 'complaint_issue',
        name: 'Complaint/Issue',
        description: 'Customer complaints or issues',
        keywords: ['complaint', 'issue', 'problem', 'dissatisfied', 'unhappy', 'wrong'],
        patterns: [/not happy/i, /complaint.*about/i, /problem.*with/i, /issue.*with/i],
        priority: 10,
        color: '#DC2626',
        icon: '⚠️'
      },
      {
        id: 'follow_up',
        name: 'Follow-up',
        description: 'Follow-up messages or responses to previous conversations',
        keywords: ['follow up', 'following up', 'checking', 'status', 'update'],
        patterns: [/following up/i, /checking.*on/i, /any update/i, /status.*on/i],
        priority: 5,
        color: '#059669',
        icon: '📞'
      },
      {
        id: 'positive_feedback',
        name: 'Positive Feedback',
        description: 'Thank you messages and positive feedback',
        keywords: ['thank', 'thanks', 'great', 'excellent', 'perfect', 'love', 'appreciate'],
        patterns: [/thank you/i, /great.*service/i, /love.*the/i, /excellent.*job/i],
        priority: 3,
        color: '#10B981',
        icon: '👍'
      },
      {
        id: 'urgent_request',
        name: 'Urgent Request',
        description: 'Urgent or time-sensitive messages',
        keywords: ['urgent', 'asap', 'immediately', 'emergency', 'quickly', 'right away'],
        patterns: [/urgent/i, /asap/i, /as soon as possible/i, /emergency/i],
        priority: 10,
        color: '#DC2626',
        icon: '🚨'
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category);
    });

    console.log('📂 [CATEGORIZATION SERVICE] Initialized with', this.categories.size, 'categories');
  }

  // Categorize a single message
  categorizeMessage(messageId: string, content: string, metadata: any = {}): CategorizationResult {
    // Check cache first
    const cached = this.categorizationCache.get(messageId);
    if (cached) return cached;

    console.log('🏷️ [CATEGORIZATION SERVICE] Categorizing message:', messageId);

    const normalizedContent = content.toLowerCase();
    const categoryScores = new Map<string, number>();

    // Score each category
    this.categories.forEach((category, categoryId) => {
      let score = 0;

      // Keyword matching
      const keywordMatches = category.keywords.filter(keyword => 
        normalizedContent.includes(keyword.toLowerCase())
      ).length;
      score += keywordMatches * 0.3;

      // Pattern matching
      const patternMatches = category.patterns.filter(pattern => 
        pattern.test(content)
      ).length;
      score += patternMatches * 0.5;

      // Context boost based on metadata
      if (metadata.direction === 'in' && categoryId === 'general_interest') {
        score += 0.2; // Boost general interest for incoming messages
      }

      if (metadata.aiGenerated === false && categoryId === 'follow_up') {
        score += 0.3; // Boost follow-up for human-sent messages
      }

      categoryScores.set(categoryId, score);
    });

    // Get top categories
    const sortedCategories = Array.from(categoryScores.entries())
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    const primaryCategory = sortedCategories[0]?.[0] || 'general_interest';
    const confidence = this.calculateConfidence(sortedCategories[0]?.[1] || 0);
    
    // Determine additional attributes
    const intent = this.detectIntent(content);
    const sentiment = this.detectSentiment(content);
    const urgency = this.detectUrgency(content, metadata);
    const actionRequired = this.requiresAction(content, primaryCategory);
    const tags = this.generateTags(content, primaryCategory);

    const result: CategorizationResult = {
      messageId,
      categories: sortedCategories.slice(0, 3).map(([id]) => id),
      confidence,
      primaryCategory,
      tags,
      intent,
      sentiment,
      urgency,
      actionRequired,
      suggestedResponse: this.generateSuggestedResponse(primaryCategory, intent)
    };

    // Cache result
    this.categorizationCache.set(messageId, result);
    this.updateAnalytics(result);

    return result;
  }

  // Batch categorize multiple messages
  categorizeMessages(messages: Array<{id: string, content: string, metadata?: any}>): CategorizationResult[] {
    console.log('🏷️ [CATEGORIZATION SERVICE] Batch categorizing', messages.length, 'messages');
    
    return messages.map(msg => 
      this.categorizeMessage(msg.id, msg.content, msg.metadata || {})
    );
  }

  private calculateConfidence(score: number): number {
    // Normalize score to confidence percentage
    if (score >= 1.0) return 0.95;
    if (score >= 0.8) return 0.90;
    if (score >= 0.6) return 0.80;
    if (score >= 0.4) return 0.70;
    if (score >= 0.2) return 0.60;
    return 0.50;
  }

  private detectIntent(content: string): string {
    const normalizedContent = content.toLowerCase();
    
    // Question patterns
    if (/\?/.test(content) || /how|what|when|where|why|which/i.test(content)) {
      return 'question';
    }
    
    // Request patterns
    if (/can you|could you|please|would like/i.test(content)) {
      return 'request';
    }
    
    // Information sharing
    if (/i am|i have|my|here is/i.test(content)) {
      return 'information';
    }
    
    // Complaint patterns
    if (/not happy|disappointed|problem|issue|complaint/i.test(content)) {
      return 'complaint';
    }
    
    // Positive feedback
    if (/thank|great|excellent|love|perfect/i.test(content)) {
      return 'appreciation';
    }
    
    return 'general';
  }

  private detectSentiment(content: string): string {
    const positiveWords = ['great', 'good', 'excellent', 'perfect', 'love', 'amazing', 'wonderful', 'fantastic', 'thank', 'appreciate'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'problem', 'issue', 'complaint'];
    
    const normalizedContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => normalizedContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => normalizedContent.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectUrgency(content: string, metadata: any): 'low' | 'medium' | 'high' | 'urgent' {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'quickly', 'right away'];
    const highKeywords = ['soon', 'today', 'this week', 'important'];
    
    const normalizedContent = content.toLowerCase();
    
    if (urgentKeywords.some(keyword => normalizedContent.includes(keyword))) {
      return 'urgent';
    }
    
    if (highKeywords.some(keyword => normalizedContent.includes(keyword))) {
      return 'high';
    }
    
    // Check time-based urgency
    if (metadata.direction === 'in') {
      const messageTime = new Date(metadata.sentAt || Date.now());
      const hourOfDay = messageTime.getHours();
      
      // Messages sent outside business hours might be more urgent
      if (hourOfDay < 8 || hourOfDay > 18) {
        return 'high';
      }
    }
    
    return 'medium';
  }

  private requiresAction(content: string, category: string): boolean {
    // Categories that typically require action
    const actionCategories = ['appointment_request', 'complaint_issue', 'urgent_request', 'pricing_inquiry'];
    
    if (actionCategories.includes(category)) return true;
    
    // Question patterns that require response
    if (/\?/.test(content)) return true;
    
    // Request patterns
    if (/can you|could you|please|would like|need/i.test(content)) return true;
    
    return false;
  }

  private generateTags(content: string, primaryCategory: string): string[] {
    const tags = new Set<string>();
    const normalizedContent = content.toLowerCase();
    
    // Add primary category as tag
    tags.add(primaryCategory.replace('_', '-'));
    
    // Vehicle-specific tags
    const vehicleTypes = ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'hybrid', 'electric'];
    vehicleTypes.forEach(type => {
      if (normalizedContent.includes(type)) tags.add(type);
    });
    
    // Brand tags
    const brands = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi'];
    brands.forEach(brand => {
      if (normalizedContent.includes(brand)) tags.add(brand);
    });
    
    // Financial tags
    if (normalizedContent.includes('finance') || normalizedContent.includes('loan')) tags.add('financing');
    if (normalizedContent.includes('lease')) tags.add('leasing');
    if (normalizedContent.includes('cash')) tags.add('cash-purchase');
    
    // Timeline tags
    if (normalizedContent.includes('today') || normalizedContent.includes('now')) tags.add('immediate');
    if (normalizedContent.includes('this week')) tags.add('this-week');
    if (normalizedContent.includes('next week')) tags.add('next-week');
    
    return Array.from(tags);
  }

  private generateSuggestedResponse(category: string, intent: string): string | undefined {
    const responses: Record<string, string> = {
      'pricing_inquiry': "I'd be happy to provide pricing information. Let me get you the latest pricing for that vehicle.",
      'appointment_request': "I can definitely help you schedule an appointment. What day and time works best for you?",
      'vehicle_inquiry': "Let me check our current inventory for vehicles that match what you're looking for.",
      'trade_inquiry': "I can help you get an estimate for your trade-in value. What vehicle are you currently driving?",
      'service_support': "I'll connect you with our service department to address your needs.",
      'complaint_issue': "I apologize for any inconvenience. Let me see how we can resolve this for you.",
      'urgent_request': "I understand this is urgent. Let me prioritize this and get back to you immediately."
    };
    
    return responses[category];
  }

  private updateAnalytics(result: CategorizationResult) {
    this.analytics.totalMessages++;
    
    // Update category distribution
    const current = this.analytics.categoryDistribution.get(result.primaryCategory) || 0;
    this.analytics.categoryDistribution.set(result.primaryCategory, current + 1);
    
    // Update average confidence
    this.analytics.avgConfidence = 
      (this.analytics.avgConfidence * (this.analytics.totalMessages - 1) + result.confidence) / 
      this.analytics.totalMessages;
    
    // Update trends (daily)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayTrend = this.analytics.trendsOverTime.find(trend => 
      trend.date.getTime() === today.getTime()
    );
    
    if (!todayTrend) {
      todayTrend = { date: today, categories: {} };
      this.analytics.trendsOverTime.push(todayTrend);
    }
    
    todayTrend.categories[result.primaryCategory] = 
      (todayTrend.categories[result.primaryCategory] || 0) + 1;
    
    // Keep only last 30 days
    if (this.analytics.trendsOverTime.length > 30) {
      this.analytics.trendsOverTime.shift();
    }
  }

  // Public API methods
  getCategories(): MessageCategory[] {
    return Array.from(this.categories.values());
  }

  getCategoryById(id: string): MessageCategory | undefined {
    return this.categories.get(id);
  }

  getMessagesInCategory(category: string): CategorizationResult[] {
    return Array.from(this.categorizationCache.values())
      .filter(result => result.primaryCategory === category);
  }

  searchByCategory(categories: string[]): CategorizationResult[] {
    return Array.from(this.categorizationCache.values())
      .filter(result => categories.some(cat => result.categories.includes(cat)));
  }

  getUrgentMessages(): CategorizationResult[] {
    return Array.from(this.categorizationCache.values())
      .filter(result => result.urgency === 'urgent' || result.urgency === 'high')
      .sort((a, b) => {
        const urgencyOrder = { urgent: 3, high: 2, medium: 1, low: 0 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
  }

  getActionRequiredMessages(): CategorizationResult[] {
    return Array.from(this.categorizationCache.values())
      .filter(result => result.actionRequired);
  }

  getAnalytics(): CategoryAnalytics {
    return {
      ...this.analytics,
      categoryDistribution: new Map(this.analytics.categoryDistribution)
    };
  }

  // Clear cache
  clearCache() {
    this.categorizationCache.clear();
  }
}

export const messageCategorizationService = new MessageCategorizationService();
