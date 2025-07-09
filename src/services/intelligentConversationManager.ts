import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  leadId: string;
  conversationHistory: Array<{
    message: string;
    direction: 'in' | 'out';
    timestamp: Date;
    intent?: string;
    sentiment?: number;
  }>;
  currentIntent: string;
  sentimentTrend: number[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  escalationSignals: string[];
  responseStrategy: string;
  lastEngagementScore: number;
}

export interface IntentRecognition {
  intent: string;
  confidence: number;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  requiresEscalation: boolean;
  suggestedActions: string[];
}

class IntelligentConversationManager {
  private static instance: IntelligentConversationManager;
  private conversationContexts = new Map<string, ConversationContext>();
  private intentPatterns = new Map<string, RegExp[]>();
  private escalationTriggers = new Set<string>();

  static getInstance(): IntelligentConversationManager {
    if (!IntelligentConversationManager.instance) {
      IntelligentConversationManager.instance = new IntelligentConversationManager();
    }
    return IntelligentConversationManager.instance;
  }

  constructor() {
    this.initializeIntentPatterns();
    this.initializeEscalationTriggers();
  }

  private initializeIntentPatterns(): void {
    // Purchase Intent Patterns
    this.intentPatterns.set('purchase_intent', [
      /\b(buy|purchase|financing|finance|payment|down payment|monthly payment)\b/i,
      /\b(how much|price|cost|affordable|budget)\b/i,
      /\b(ready to|want to|looking to|interested in) (buy|purchase)\b/i,
      /\b(trade in|trade-in|tradein)\b/i
    ]);

    // Information Seeking Patterns
    this.intentPatterns.set('information_seeking', [
      /\b(tell me|what|how|when|where|why|specs|features|options)\b/i,
      /\b(available|inventory|stock|colors|trim|model)\b/i,
      /\b(mpg|mileage|warranty|maintenance)\b/i
    ]);

    // Scheduling Intent Patterns
    this.intentPatterns.set('scheduling_intent', [
      /\b(appointment|schedule|meet|visit|come in|test drive)\b/i,
      /\b(available|free|when can|what time)\b/i,
      /\b(today|tomorrow|this week|next week|weekend)\b/i
    ]);

    // Objection/Concern Patterns
    this.intentPatterns.set('objection_concern', [
      /\b(expensive|too much|can't afford|budget|cheaper)\b/i,
      /\b(think about|consider|maybe|not sure|hesitant)\b/i,
      /\b(other dealers|competitors|shopping around)\b/i
    ]);

    // Complaint/Issue Patterns
    this.intentPatterns.set('complaint_issue', [
      /\b(problem|issue|wrong|mistake|unhappy|disappointed)\b/i,
      /\b(not working|broken|defective|poor service)\b/i,
      /\b(refund|return|cancel|speak to manager)\b/i
    ]);

    // Positive Sentiment Patterns
    this.intentPatterns.set('positive_sentiment', [
      /\b(great|excellent|amazing|perfect|love|awesome)\b/i,
      /\b(thank you|thanks|appreciate|helpful)\b/i,
      /\b(exactly|that's what|sounds good)\b/i
    ]);
  }

  private initializeEscalationTriggers(): void {
    this.escalationTriggers.add('complaint_issue');
    this.escalationTriggers.add('legal_threat');
    this.escalationTriggers.add('manager_request');
    this.escalationTriggers.add('high_value_customer');
    this.escalationTriggers.add('multiple_objections');
    this.escalationTriggers.add('communication_breakdown');
  }

  async analyzeMessage(leadId: string, message: string, direction: 'in' | 'out'): Promise<IntentRecognition> {
    console.log('🧠 [CONVERSATION] Analyzing message:', { leadId, direction, message: message.substring(0, 100) });

    const intent = this.recognizeIntent(message);
    const sentiment = this.analyzeSentiment(message);
    const entities = this.extractEntities(message);
    
    // Update conversation context
    await this.updateConversationContext(leadId, message, direction, intent, sentiment);
    
    const context = this.conversationContexts.get(leadId);
    const requiresEscalation = this.detectEscalationNeeds(intent, sentiment, context);
    
    const recognition: IntentRecognition = {
      intent: intent.primary,
      confidence: intent.confidence,
      entities,
      requiresEscalation,
      suggestedActions: this.generateSuggestedActions(intent, context)
    };

    // Store analysis for learning
    await this.storeConversationAnalysis(leadId, message, recognition);

    return recognition;
  }

  private recognizeIntent(message: string): { primary: string; confidence: number; secondary?: string } {
    const intentScores = new Map<string, number>();

    for (const [intentType, patterns] of this.intentPatterns) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = message.match(pattern);
        if (matches) {
          score += matches.length * 0.2;
        }
      }
      if (score > 0) {
        intentScores.set(intentType, Math.min(score, 1.0));
      }
    }

    if (intentScores.size === 0) {
      return { primary: 'general_inquiry', confidence: 0.5 };
    }

    const sortedIntents = Array.from(intentScores.entries())
      .sort(([, a], [, b]) => b - a);

    return {
      primary: sortedIntents[0][0],
      confidence: sortedIntents[0][1],
      secondary: sortedIntents[1]?.[0]
    };
  }

  private analyzeSentiment(message: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'perfect', 'amazing', 'awesome', 'thank', 'appreciate'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'disappointed', 'problem', 'issue', 'wrong', 'expensive'];
    
    const words = message.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of words) {
      if (positiveWords.some(pos => word.includes(pos))) score += 0.1;
      if (negativeWords.some(neg => word.includes(neg))) score -= 0.1;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private extractEntities(message: string): Array<{ type: string; value: string; confidence: number }> {
    const entities: Array<{ type: string; value: string; confidence: number }> = [];

    // Extract vehicle mentions
    const vehiclePatterns = [
      /\b(sedan|suv|truck|coupe|convertible|hatchback)\b/gi,
      /\b(toyota|honda|ford|chevrolet|gm|nissan|hyundai)\b/gi,
      /\b(camry|accord|f-150|silverado|altima|elantra)\b/gi
    ];

    for (const pattern of vehiclePatterns) {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            type: 'vehicle',
            value: match.toLowerCase(),
            confidence: 0.8
          });
        });
      }
    }

    // Extract price mentions
    const pricePattern = /\$[\d,]+|\b\d+k?\b/gi;
    const priceMatches = message.match(pricePattern);
    if (priceMatches) {
      priceMatches.forEach(match => {
        entities.push({
          type: 'price',
          value: match,
          confidence: 0.9
        });
      });
    }

    // Extract time mentions
    const timePattern = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|next week)\b/gi;
    const timeMatches = message.match(timePattern);
    if (timeMatches) {
      timeMatches.forEach(match => {
        entities.push({
          type: 'time',
          value: match.toLowerCase(),
          confidence: 0.7
        });
      });
    }

    return entities;
  }

  private async updateConversationContext(
    leadId: string, 
    message: string, 
    direction: 'in' | 'out', 
    intent: { primary: string; confidence: number }, 
    sentiment: number
  ): Promise<void> {
    let context = this.conversationContexts.get(leadId);
    
    if (!context) {
      context = {
        leadId,
        conversationHistory: [],
        currentIntent: intent.primary,
        sentimentTrend: [],
        urgencyLevel: 'low',
        escalationSignals: [],
        responseStrategy: 'standard',
        lastEngagementScore: 0.5
      };
    }

    // Add to conversation history
    context.conversationHistory.push({
      message,
      direction,
      timestamp: new Date(),
      intent: intent.primary,
      sentiment
    });

    // Keep only last 20 messages
    if (context.conversationHistory.length > 20) {
      context.conversationHistory = context.conversationHistory.slice(-20);
    }

    // Update sentiment trend
    context.sentimentTrend.push(sentiment);
    if (context.sentimentTrend.length > 10) {
      context.sentimentTrend = context.sentimentTrend.slice(-10);
    }

    // Update current intent and urgency
    context.currentIntent = intent.primary;
    context.urgencyLevel = this.calculateUrgencyLevel(context);
    context.lastEngagementScore = this.calculateEngagementScore(context);

    this.conversationContexts.set(leadId, context);

    // Store context in database
    await this.persistConversationContext(context);
  }

  private calculateUrgencyLevel(context: ConversationContext): 'low' | 'medium' | 'high' | 'critical' {
    let urgencyScore = 0;

    // High purchase intent increases urgency
    if (context.currentIntent === 'purchase_intent') urgencyScore += 0.4;
    if (context.currentIntent === 'scheduling_intent') urgencyScore += 0.3;
    if (context.currentIntent === 'complaint_issue') urgencyScore += 0.5;

    // Recent negative sentiment trend
    const recentSentiment = context.sentimentTrend.slice(-3);
    const avgRecentSentiment = recentSentiment.reduce((sum, s) => sum + s, 0) / recentSentiment.length;
    if (avgRecentSentiment < -0.3) urgencyScore += 0.3;

    // Multiple messages in short time
    const recentMessages = context.conversationHistory.filter(
      msg => msg.timestamp.getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    );
    if (recentMessages.length > 5) urgencyScore += 0.2;

    if (urgencyScore >= 0.8) return 'critical';
    if (urgencyScore >= 0.6) return 'high';
    if (urgencyScore >= 0.3) return 'medium';
    return 'low';
  }

  private calculateEngagementScore(context: ConversationContext): number {
    let score = 0.5; // Start at neutral

    // Response rate (customer responding to our messages)
    const ourMessages = context.conversationHistory.filter(msg => msg.direction === 'out');
    const theirResponses = context.conversationHistory.filter(msg => msg.direction === 'in');
    if (ourMessages.length > 0) {
      const responseRate = theirResponses.length / ourMessages.length;
      score += responseRate * 0.3;
    }

    // Average sentiment
    const avgSentiment = context.sentimentTrend.reduce((sum, s) => sum + s, 0) / context.sentimentTrend.length;
    score += avgSentiment * 0.2;

    // Intent quality (purchase/scheduling intents are higher engagement)
    if (context.currentIntent === 'purchase_intent') score += 0.2;
    if (context.currentIntent === 'scheduling_intent') score += 0.15;
    if (context.currentIntent === 'information_seeking') score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private detectEscalationNeeds(
    intent: { primary: string; confidence: number }, 
    sentiment: number, 
    context?: ConversationContext
  ): boolean {
    // Direct escalation triggers
    if (this.escalationTriggers.has(intent.primary)) return true;

    // Negative sentiment trend
    if (sentiment < -0.5) return true;

    // Context-based escalation
    if (context) {
      // Multiple complaints or issues
      const complaints = context.conversationHistory.filter(
        msg => msg.intent === 'complaint_issue'
      ).length;
      if (complaints >= 2) return true;

      // Declining sentiment over time
      if (context.sentimentTrend.length >= 3) {
        const recent = context.sentimentTrend.slice(-3);
        const declining = recent.every((val, i) => i === 0 || val < recent[i - 1]);
        if (declining && recent[recent.length - 1] < 0) return true;
      }

      // High-value opportunity at risk
      if (context.currentIntent === 'purchase_intent' && sentiment < -0.2) return true;
    }

    return false;
  }

  private generateSuggestedActions(
    intent: { primary: string; confidence: number }, 
    context?: ConversationContext
  ): string[] {
    const actions: string[] = [];

    switch (intent.primary) {
      case 'purchase_intent':
        actions.push('schedule_appointment', 'send_pricing_info', 'offer_test_drive');
        break;
      case 'information_seeking':
        actions.push('provide_detailed_info', 'send_brochure', 'offer_consultation');
        break;
      case 'scheduling_intent':
        actions.push('check_availability', 'confirm_appointment', 'send_directions');
        break;
      case 'objection_concern':
        actions.push('address_objection', 'provide_alternatives', 'schedule_consultation');
        break;
      case 'complaint_issue':
        actions.push('escalate_to_manager', 'investigate_issue', 'offer_resolution');
        break;
      default:
        actions.push('continue_conversation', 'ask_clarifying_questions');
    }

    // Context-based additional actions
    if (context?.urgencyLevel === 'high' || context?.urgencyLevel === 'critical') {
      actions.unshift('priority_response', 'manager_notification');
    }

    return actions;
  }

  private async storeConversationAnalysis(
    leadId: string, 
    message: string, 
    recognition: IntentRecognition
  ): Promise<void> {
    try {
      await supabase.from('ai_conversation_context').upsert({
        lead_id: leadId,
        last_interaction_type: recognition.intent,
        context_score: Math.round(recognition.confidence * 100),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lead_id'
      });
    } catch (error) {
      console.error('Failed to store conversation analysis:', error);
    }
  }

  private async persistConversationContext(context: ConversationContext): Promise<void> {
    try {
      const summary = this.generateConversationSummary(context);
      const keyTopics = this.extractKeyTopics(context);

      await supabase.from('ai_conversation_context').upsert({
        lead_id: context.leadId,
        conversation_summary: summary,
        key_topics: keyTopics,
        last_interaction_type: context.currentIntent,
        context_score: Math.round(context.lastEngagementScore * 100),
        response_style: context.responseStrategy,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lead_id'
      });
    } catch (error) {
      console.error('Failed to persist conversation context:', error);
    }
  }

  private generateConversationSummary(context: ConversationContext): string {
    const recentMessages = context.conversationHistory.slice(-5);
    const intents = [...new Set(recentMessages.map(msg => msg.intent).filter(Boolean))];
    const avgSentiment = context.sentimentTrend.slice(-5).reduce((sum, s) => sum + s, 0) / Math.max(context.sentimentTrend.slice(-5).length, 1);

    let summary = `Recent conversation showing ${intents.join(', ')} intent(s). `;
    
    if (avgSentiment > 0.2) {
      summary += 'Positive sentiment trend. ';
    } else if (avgSentiment < -0.2) {
      summary += 'Negative sentiment trend. ';
    } else {
      summary += 'Neutral sentiment. ';
    }

    summary += `Urgency level: ${context.urgencyLevel}. `;
    summary += `Engagement score: ${Math.round(context.lastEngagementScore * 100)}%.`;

    return summary;
  }

  private extractKeyTopics(context: ConversationContext): string[] {
    const topics = new Set<string>();
    
    for (const msg of context.conversationHistory) {
      if (msg.intent) topics.add(msg.intent);
      
      // Extract vehicle-related topics
      const vehicleMatches = msg.message.match(/\b(sedan|suv|truck|financing|trade|price|payment)\b/gi);
      if (vehicleMatches) {
        vehicleMatches.forEach(match => topics.add(match.toLowerCase()));
      }
    }

    return Array.from(topics).slice(0, 10); // Limit to 10 topics
  }

  async getConversationInsights(leadId: string): Promise<{
    context: ConversationContext | null;
    insights: {
      communicationStyle: string;
      preferredTopics: string[];
      responsePattern: string;
      nextBestAction: string;
      riskFactors: string[];
    };
  }> {
    const context = this.conversationContexts.get(leadId);
    
    if (!context) {
      return {
        context: null,
        insights: {
          communicationStyle: 'unknown',
          preferredTopics: [],
          responsePattern: 'unknown',
          nextBestAction: 'initiate_conversation',
          riskFactors: []
        }
      };
    }

    const insights = {
      communicationStyle: this.determineCommunicationStyle(context),
      preferredTopics: this.getPreferredTopics(context),
      responsePattern: this.analyzeResponsePattern(context),
      nextBestAction: this.recommendNextAction(context),
      riskFactors: this.identifyRiskFactors(context)
    };

    return { context, insights };
  }

  private determineCommunicationStyle(context: ConversationContext): string {
    const avgSentiment = context.sentimentTrend.reduce((sum, s) => sum + s, 0) / context.sentimentTrend.length;
    const responseLength = context.conversationHistory
      .filter(msg => msg.direction === 'in')
      .reduce((sum, msg) => sum + msg.message.length, 0) / 
      Math.max(context.conversationHistory.filter(msg => msg.direction === 'in').length, 1);

    if (avgSentiment > 0.3 && responseLength > 100) return 'detailed_positive';
    if (avgSentiment > 0.1 && responseLength < 50) return 'brief_positive';
    if (avgSentiment < -0.1 && responseLength > 100) return 'detailed_concerned';
    if (avgSentiment < -0.1 && responseLength < 50) return 'brief_negative';
    if (responseLength > 100) return 'detailed_neutral';
    return 'brief_neutral';
  }

  private getPreferredTopics(context: ConversationContext): string[] {
    const topicCounts = new Map<string, number>();
    
    context.conversationHistory
      .filter(msg => msg.direction === 'in' && msg.intent)
      .forEach(msg => {
        if (msg.intent) {
          topicCounts.set(msg.intent, (topicCounts.get(msg.intent) || 0) + 1);
        }
      });

    return Array.from(topicCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  private analyzeResponsePattern(context: ConversationContext): string {
    const customerMessages = context.conversationHistory.filter(msg => msg.direction === 'in');
    if (customerMessages.length < 2) return 'insufficient_data';

    const responseIntervals = [];
    for (let i = 1; i < customerMessages.length; i++) {
      const interval = customerMessages[i].timestamp.getTime() - customerMessages[i-1].timestamp.getTime();
      responseIntervals.push(interval);
    }

    const avgInterval = responseIntervals.reduce((sum, interval) => sum + interval, 0) / responseIntervals.length;
    const hours = avgInterval / (1000 * 60 * 60);

    if (hours < 1) return 'immediate_responder';
    if (hours < 4) return 'quick_responder';
    if (hours < 24) return 'same_day_responder';
    return 'delayed_responder';
  }

  private recommendNextAction(context: ConversationContext): string {
    if (context.urgencyLevel === 'critical') return 'immediate_manager_intervention';
    if (context.urgencyLevel === 'high') return 'priority_personal_outreach';
    
    switch (context.currentIntent) {
      case 'purchase_intent':
        return 'schedule_sales_appointment';
      case 'scheduling_intent':
        return 'confirm_appointment_details';
      case 'information_seeking':
        return 'provide_comprehensive_information';
      case 'objection_concern':
        return 'address_concerns_personally';
      case 'complaint_issue':
        return 'escalate_to_service_manager';
      default:
        return 'continue_nurturing_conversation';
    }
  }

  private identifyRiskFactors(context: ConversationContext): string[] {
    const risks: string[] = [];

    // Declining sentiment
    if (context.sentimentTrend.length >= 3) {
      const recent = context.sentimentTrend.slice(-3);
      if (recent.every((val, i) => i === 0 || val < recent[i - 1])) {
        risks.push('declining_sentiment');
      }
    }

    // Long response delays
    const customerMessages = context.conversationHistory.filter(msg => msg.direction === 'in');
    if (customerMessages.length >= 2) {
      const lastMessage = customerMessages[customerMessages.length - 1];
      const timeSinceLastResponse = Date.now() - lastMessage.timestamp.getTime();
      if (timeSinceLastResponse > 7 * 24 * 60 * 60 * 1000) { // 7 days
        risks.push('extended_silence');
      }
    }

    // Multiple objections
    const objections = context.conversationHistory.filter(msg => msg.intent === 'objection_concern');
    if (objections.length >= 2) {
      risks.push('multiple_objections');
    }

    // Complaint without resolution
    const complaints = context.conversationHistory.filter(msg => msg.intent === 'complaint_issue');
    if (complaints.length > 0 && context.sentimentTrend.slice(-2).every(s => s < 0)) {
      risks.push('unresolved_complaint');
    }

    return risks;
  }

  getSystemStatus(): {
    activeConversations: number;
    avgEngagementScore: number;
    highUrgencyCount: number;
    escalationRate: number;
  } {
    const contexts = Array.from(this.conversationContexts.values());
    
    return {
      activeConversations: contexts.length,
      avgEngagementScore: contexts.reduce((sum, ctx) => sum + ctx.lastEngagementScore, 0) / Math.max(contexts.length, 1),
      highUrgencyCount: contexts.filter(ctx => ctx.urgencyLevel === 'high' || ctx.urgencyLevel === 'critical').length,
      escalationRate: contexts.filter(ctx => ctx.escalationSignals.length > 0).length / Math.max(contexts.length, 1)
    };
  }
}

export const intelligentConversationManager = IntelligentConversationManager.getInstance();
