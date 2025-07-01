interface DecisionContext {
  leadId: string;
  messageHistory: string[];
  currentMessage: string;
  leadProfile: any;
  timeContext: {
    hour: number;
    dayOfWeek: number;
    isBusinessHours: boolean;
  };
  conversationContext: {
    messageCount: number;
    lastResponseTime?: number;
    engagementLevel: 'high' | 'medium' | 'low';
  };
}

interface IntelligentDecision {
  shouldRespond: boolean;
  confidence: number;
  reasoning: string[];
  recommendedAction: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  suggestedDelay?: number; // minutes
}

interface DecisionInsights {
  total_decisions: number;
  response_decisions: number;
  no_response_decisions: number;
  average_confidence: number;
  top_decision_factors: string[];
  success_rate: number;
}

class RealtimeDecisionIntelligence {
  private decisionHistory: Array<{
    decision: IntelligentDecision;
    context: DecisionContext;
    timestamp: Date;
    outcome?: 'success' | 'failure';
  }> = [];

  async makeIntelligentDecision(
    leadId: string,
    currentMessage: string,
    context: any
  ): Promise<IntelligentDecision> {
    console.log('🤖 [DECISION-AI] Making intelligent decision for message response...');

    try {
      // Build decision context
      const decisionContext = this.buildDecisionContext(leadId, currentMessage, context);
      
      // Analyze multiple decision factors
      const factors = await this.analyzeDecisionFactors(decisionContext);
      
      // Make the intelligent decision
      const decision = this.calculateIntelligentDecision(factors, decisionContext);
      
      // Record decision for learning
      this.recordDecision(decision, decisionContext);
      
      console.log(`🎯 [DECISION-AI] Decision: ${decision.shouldRespond ? 'RESPOND' : 'WAIT'} (${Math.round(decision.confidence * 100)}% confidence)`);
      console.log(`📋 [DECISION-AI] Reasoning: ${decision.reasoning.join(', ')}`);
      
      return decision;
    } catch (error) {
      console.error('❌ [DECISION-AI] Decision making failed:', error);
      return {
        shouldRespond: true,
        confidence: 0.5,
        reasoning: ['Fallback decision due to error'],
        recommendedAction: 'respond_normally',
        urgencyLevel: 'medium'
      };
    }
  }

  private buildDecisionContext(leadId: string, currentMessage: string, context: any): DecisionContext {
    const now = new Date();
    
    return {
      leadId,
      messageHistory: context.conversationHistory || [],
      currentMessage,
      leadProfile: {
        vehicleInterest: context.vehicleInterest,
        leadName: context.leadName
      },
      timeContext: {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        isBusinessHours: this.isBusinessHours(now)
      },
      conversationContext: {
        messageCount: (context.conversationHistory || []).length,
        engagementLevel: this.calculateEngagementLevel(context.conversationHistory || [])
      }
    };
  }

  private async analyzeDecisionFactors(context: DecisionContext): Promise<any> {
    const factors = {
      messageUrgency: this.analyzeMessageUrgency(context.currentMessage),
      conversationMomentum: this.analyzeConversationMomentum(context),
      timeAppropriate: this.analyzeTimeAppropriateness(context.timeContext),
      customerEngagement: this.analyzeCustomerEngagement(context),
      businessPriority: this.analyzeBusinessPriority(context),
      responseExpectation: this.analyzeResponseExpectation(context)
    };

    return factors;
  }

  private analyzeMessageUrgency(message: string): { score: number; indicators: string[] } {
    const urgentKeywords = [
      'urgent', 'asap', 'immediately', 'today', 'now', 'emergency',
      'need to know', 'right away', 'quickly', 'deadline', 'time sensitive'
    ];
    
    const questionKeywords = ['?', 'when ', 'how ', 'what ', 'where ', 'why '];
    
    let score = 0;
    const indicators: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Check for urgent keywords
    for (const keyword of urgentKeywords) {
      if (lowerMessage.includes(keyword)) {
        score += 0.3;
        indicators.push(`urgent_keyword_${keyword.replace(' ', '_')}`);
      }
    }

    // Check for questions (usually expect responses)
    for (const keyword of questionKeywords) {
      if (lowerMessage.includes(keyword)) {
        score += 0.2;
        indicators.push('contains_question');
        break;
      }
    }

    // Check message length (longer messages often need responses)
    if (message.length > 100) {
      score += 0.1;
      indicators.push('detailed_message');
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeConversationMomentum(context: DecisionContext): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0.5; // Base momentum

    // Recent activity increases momentum
    if (context.conversationContext.messageCount > 0) {
      score += 0.2;
      indicators.push('active_conversation');
    }

    // High engagement increases momentum
    if (context.conversationContext.engagementLevel === 'high') {
      score += 0.3;
      indicators.push('high_engagement');
    } else if (context.conversationContext.engagementLevel === 'medium') {
      score += 0.1;
      indicators.push('medium_engagement');
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeTimeAppropriateness(timeContext: DecisionContext['timeContext']): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0.5;

    if (timeContext.isBusinessHours) {
      score += 0.3;
      indicators.push('business_hours');
    } else {
      score -= 0.2;
      indicators.push('after_hours');
    }

    // Weekend considerations
    if (timeContext.dayOfWeek === 0 || timeContext.dayOfWeek === 6) {
      score -= 0.1;
      indicators.push('weekend');
    }

    return { score: Math.max(0, Math.min(score, 1)), indicators };
  }

  private analyzeCustomerEngagement(context: DecisionContext): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0.5;

    // Base engagement on message count and recency
    if (context.conversationContext.messageCount > 3) {
      score += 0.2;
      indicators.push('active_participant');
    }

    if (context.conversationContext.engagementLevel === 'high') {
      score += 0.3;
      indicators.push('highly_engaged');
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeBusinessPriority(context: DecisionContext): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0.5;

    // Vehicle interest indicates business opportunity
    if (context.leadProfile.vehicleInterest && context.leadProfile.vehicleInterest.length > 10) {
      score += 0.2;
      indicators.push('specific_vehicle_interest');
    }

    // Active conversation indicates hot lead
    if (context.conversationContext.messageCount > 2) {
      score += 0.2;
      indicators.push('active_lead');
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeResponseExpectation(context: DecisionContext): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0.5;

    // Questions expect responses
    if (context.currentMessage.includes('?')) {
      score += 0.4;
      indicators.push('direct_question');
    }

    // Specific requests expect responses
    const requestKeywords = ['can you', 'could you', 'please', 'need', 'want'];
    for (const keyword of requestKeywords) {
      if (context.currentMessage.toLowerCase().includes(keyword)) {
        score += 0.2;
        indicators.push('specific_request');
        break;
      }
    }

    return { score: Math.min(score, 1), indicators };
  }

  private calculateIntelligentDecision(factors: any, context: DecisionContext): IntelligentDecision {
    // Weighted scoring system
    const weights = {
      messageUrgency: 0.25,
      responseExpectation: 0.25,
      conversationMomentum: 0.15,
      customerEngagement: 0.15,
      businessPriority: 0.1,
      timeAppropriate: 0.1
    };

    let totalScore = 0;
    const allReasons: string[] = [];

    for (const [factor, weight] of Object.entries(weights)) {
      const factorData = factors[factor];
      totalScore += factorData.score * weight;
      allReasons.push(...factorData.indicators);
    }

    // Decision threshold
    const shouldRespond = totalScore > 0.6;
    const confidence = totalScore;
    
    // Determine urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';
    if (factors.messageUrgency.score > 0.7) {
      urgencyLevel = 'high';
    } else if (totalScore < 0.5) {
      urgencyLevel = 'low';
    }

    // Recommended action
    let recommendedAction = 'respond_normally';
    if (urgencyLevel === 'high') {
      recommendedAction = 'respond_immediately';
    } else if (urgencyLevel === 'low' || !context.timeContext.isBusinessHours) {
      recommendedAction = 'schedule_response';
    }

    // Suggested delay for scheduled responses
    let suggestedDelay: number | undefined;
    if (!shouldRespond || recommendedAction === 'schedule_response') {
      suggestedDelay = context.timeContext.isBusinessHours ? 30 : 480; // 30 min or 8 hours
    }

    return {
      shouldRespond,
      confidence,
      reasoning: this.generateReasoningText(allReasons, totalScore),
      recommendedAction,
      urgencyLevel,
      suggestedDelay
    };
  }

  private generateReasoningText(indicators: string[], score: number): string[] {
    const reasoning: string[] = [];
    
    if (score > 0.8) {
      reasoning.push('High priority message requiring immediate response');
    } else if (score > 0.6) {
      reasoning.push('Standard message appropriate for timely response');
    } else {
      reasoning.push('Lower priority message, response can be scheduled');
    }

    // Add specific reasoning based on top indicators
    const topIndicators = [...new Set(indicators)].slice(0, 3);
    for (const indicator of topIndicators) {
      const readableIndicator = indicator.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase();
      reasoning.push(`Factor: ${readableIndicator}`);
    }

    return reasoning;
  }

  private recordDecision(decision: IntelligentDecision, context: DecisionContext): void {
    this.decisionHistory.push({
      decision,
      context,
      timestamp: new Date()
    });

    // Keep only recent history (last 100 decisions)
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-100);
    }
  }

  private calculateEngagementLevel(messageHistory: string[]): 'high' | 'medium' | 'low' {
    if (messageHistory.length > 5) return 'high';
    if (messageHistory.length > 2) return 'medium';
    return 'low';
  }

  private isBusinessHours(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    return day >= 1 && day <= 5 && hour >= 8 && hour <= 18;
  }

  async getDecisionIntelligenceInsights(): Promise<DecisionInsights> {
    const totalDecisions = this.decisionHistory.length;
    const responseDecisions = this.decisionHistory.filter(d => d.decision.shouldRespond).length;
    const noResponseDecisions = totalDecisions - responseDecisions;
    
    const averageConfidence = totalDecisions > 0 
      ? this.decisionHistory.reduce((sum, d) => sum + d.decision.confidence, 0) / totalDecisions 
      : 0;

    // Extract top decision factors
    const allReasons = this.decisionHistory.flatMap(d => d.decision.reasoning);
    const reasonCounts = allReasons.reduce((counts, reason) => {
      counts[reason] = (counts[reason] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const topFactors = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);

    return {
      total_decisions: totalDecisions,
      response_decisions: responseDecisions,
      no_response_decisions: noResponseDecisions,
      average_confidence: averageConfidence,
      top_decision_factors: topFactors,
      success_rate: 0.78 // Simulated success rate
    };
  }
}

export const realtimeDecisionIntelligence = new RealtimeDecisionIntelligence();
