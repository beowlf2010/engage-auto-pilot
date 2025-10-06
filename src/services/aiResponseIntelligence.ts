
import { supabase } from '@/integrations/supabase/client';

export interface ConversationAnalysis {
  leadTemperature: number; // 0-100
  conversationStage: 'discovery' | 'presentation' | 'objection_handling' | 'closing' | 'follow_up';
  stage?: 'discovery' | 'presentation' | 'objection_handling' | 'closing' | 'follow_up'; // Fallback field
  buyingSignals: BuyingSignal[];
  sentimentTrend: 'positive' | 'neutral' | 'negative';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  urgency?: 'low' | 'medium' | 'high' | 'critical'; // Fallback field
  nextBestActions: string[];
}

export interface BuyingSignal {
  type: 'interest' | 'urgency' | 'budget' | 'authority' | 'objection';
  strength: number; // 0-1
  text: string;
  confidence: number;
}

export interface AIResponseSuggestion {
  message: string;
  confidence: number;
  reasoning: string;
  responseType: 'discovery' | 'objection_handling' | 'closing' | 'follow_up' | 'information';
  priority: 'high' | 'medium' | 'low';
}

class AIResponseIntelligence {
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  private getCacheKey(leadId: string, messagesLength: number): string {
    return `${leadId}-${messagesLength}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async analyzeConversation(
    leadId: string,
    messages: any[],
    leadContext: any
  ): Promise<ConversationAnalysis> {
    const cacheKey = this.getCacheKey(leadId, messages.length);
    const cached = this.getFromCache(cacheKey);
    if (cached?.analysis) {
      console.log('✅ Using cached AI analysis');
      return cached.analysis;
    }

    // Try AI analysis first
    try {
      const { data, error } = await supabase.functions.invoke('conversation-intelligence', {
        body: {
          leadId,
          messages: messages.map(m => ({
            direction: m.direction,
            body: m.body,
            sentAt: m.sent_at
          })),
          leadContext: {
            name: leadContext.name,
            vehicleInterest: leadContext.vehicle_interest,
            status: leadContext.status
          }
        }
      });

      if (!error && data && !data.error && data.analysis) {
        console.log('✅ AI analysis successful');
        this.setCache(cacheKey, { analysis: data.analysis, suggestions: data.suggestions });
        return data.analysis;
      }

      if (data?.error) {
        console.warn('⚠️ AI analysis error:', data.error, '- falling back to rule-based');
      }
    } catch (error) {
      console.warn('⚠️ AI analysis failed:', error, '- falling back to rule-based');
    }

    // Fallback to rule-based analysis
    console.log('📋 Using rule-based analysis');

    try {
      console.log('🔍 Analyzing conversation for AI intelligence:', leadId);

      const recentMessages = messages.slice(-10);
      const conversationText = recentMessages
        .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
        .join('\n');

      // Analyze buying signals
      const buyingSignals = this.detectBuyingSignals(conversationText);
      
      // Calculate lead temperature
      const leadTemperature = this.calculateLeadTemperature(messages, buyingSignals);
      
      // Determine conversation stage
      const conversationStage = this.determineConversationStage(conversationText, buyingSignals);
      
      // Analyze sentiment trend
      const sentimentTrend = this.analyzeSentimentTrend(recentMessages);
      
      // Determine urgency level
      const urgencyLevel = this.determineUrgencyLevel(conversationText, buyingSignals);
      
      // Generate next best actions
      const nextBestActions = this.generateNextBestActions(conversationStage, buyingSignals, leadTemperature);

      return {
        leadTemperature,
        conversationStage,
        buyingSignals,
        sentimentTrend,
        urgencyLevel,
        nextBestActions
      };
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      return this.getDefaultAnalysis();
    }
  }

  async generateResponseSuggestions(
    analysis: ConversationAnalysis,
    lastMessage: string,
    leadContext: any
  ): Promise<AIResponseSuggestion[]> {
    // Check if we have AI suggestions in cache from analyzeConversation
    const cacheKey = this.getCacheKey(leadContext.id, 0);
    const cached = this.getFromCache(cacheKey);
    if (cached?.suggestions && Array.isArray(cached.suggestions)) {
      console.log('✅ Using cached AI suggestions');
      return cached.suggestions;
    }

    try {
      console.log('🤖 Generating rule-based response suggestions');

      const suggestions: AIResponseSuggestion[] = [];

      // Generate stage-specific responses
      switch (analysis.conversationStage) {
        case 'discovery':
          suggestions.push(...this.generateDiscoveryResponses(lastMessage, analysis));
          break;
        case 'presentation':
          suggestions.push(...this.generatePresentationResponses(lastMessage, analysis));
          break;
        case 'objection_handling':
          suggestions.push(...this.generateObjectionResponses(lastMessage, analysis));
          break;
        case 'closing':
          suggestions.push(...this.generateClosingResponses(lastMessage, analysis));
          break;
        case 'follow_up':
          suggestions.push(...this.generateFollowUpResponses(lastMessage, analysis));
          break;
      }

      // Sort by confidence and priority
      return suggestions
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return b.confidence - a.confidence;
        })
        .slice(0, 5); // Return top 5 suggestions
    } catch (error) {
      console.error('Error generating response suggestions:', error);
      return [];
    }
  }

  private detectBuyingSignals(conversationText: string): BuyingSignal[] {
    const signals: BuyingSignal[] = [];
    const text = conversationText.toLowerCase();

    // Interest signals
    const interestPatterns = [
      { pattern: /\b(interested|like|love|perfect|exactly what)\b/, strength: 0.8 },
      { pattern: /\b(tell me more|learn more|details)\b/, strength: 0.6 },
      { pattern: /\b(looks good|sounds good)\b/, strength: 0.7 }
    ];

    // Urgency signals
    const urgencyPatterns = [
      { pattern: /\b(asap|urgent|soon|today|tomorrow)\b/, strength: 0.9 },
      { pattern: /\b(need by|need soon|time sensitive)\b/, strength: 0.8 },
      { pattern: /\b(quickly|fast|immediate)\b/, strength: 0.7 }
    ];

    // Budget signals
    const budgetPatterns = [
      { pattern: /\b(price|cost|budget|afford|payment)\b/, strength: 0.7 },
      { pattern: /\b(financing|loan|monthly|down payment)\b/, strength: 0.8 },
      { pattern: /\b(how much|what's the cost)\b/, strength: 0.9 }
    ];

    // Authority signals
    const authorityPatterns = [
      { pattern: /\b(my decision|I decide|I'll take it)\b/, strength: 0.9 },
      { pattern: /\b(need to ask|check with|discuss with)\b/, strength: 0.4 }
    ];

    // Objection signals
    const objectionPatterns = [
      { pattern: /\b(but|however|concerned|worry|problem)\b/, strength: 0.6 },
      { pattern: /\b(too expensive|can't afford|not sure)\b/, strength: 0.8 },
      { pattern: /\b(think about it|need time|not ready)\b/, strength: 0.7 }
    ];

    [
      ...interestPatterns.map(p => ({ ...p, type: 'interest' as const })),
      ...urgencyPatterns.map(p => ({ ...p, type: 'urgency' as const })),
      ...budgetPatterns.map(p => ({ ...p, type: 'budget' as const })),
      ...authorityPatterns.map(p => ({ ...p, type: 'authority' as const })),
      ...objectionPatterns.map(p => ({ ...p, type: 'objection' as const }))
    ].forEach(({ pattern, strength, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        signals.push({
          type,
          strength,
          text: matches[0],
          confidence: 0.8
        });
      }
    });

    return signals;
  }

  private calculateLeadTemperature(messages: any[], buyingSignals: BuyingSignal[]): number {
    let temperature = 50; // Base temperature

    // Message engagement factor
    const responseRate = messages.filter(m => m.direction === 'in').length / Math.max(messages.filter(m => m.direction === 'out').length, 1);
    temperature += Math.min(responseRate * 20, 25);

    // Buying signals factor
    buyingSignals.forEach(signal => {
      temperature += signal.strength * 20;
    });

    // Recency factor
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.direction === 'in') {
      const hoursSinceLastReply = (Date.now() - new Date(lastMessage.sentAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastReply < 2) temperature += 15;
      else if (hoursSinceLastReply < 24) temperature += 5;
      else if (hoursSinceLastReply > 72) temperature -= 20;
    }

    return Math.max(0, Math.min(100, temperature));
  }

  private determineConversationStage(conversationText: string, buyingSignals: BuyingSignal[]): ConversationAnalysis['conversationStage'] {
    const text = conversationText.toLowerCase();

    // Check for closing indicators
    if (buyingSignals.some(s => s.type === 'authority' && s.strength > 0.8) ||
        text.includes('ready to buy') || text.includes('let\'s do it')) {
      return 'closing';
    }

    // Check for objections
    if (buyingSignals.some(s => s.type === 'objection')) {
      return 'objection_handling';
    }

    // Check for presentation stage
    if (text.includes('features') || text.includes('specs') || text.includes('tell me about')) {
      return 'presentation';
    }

    // Check for follow-up
    if (text.includes('think about') || text.includes('get back to you') || text.includes('call me later')) {
      return 'follow_up';
    }

    // Default to discovery
    return 'discovery';
  }

  private analyzeSentimentTrend(messages: any[]): 'positive' | 'neutral' | 'negative' {
    const recentCustomerMessages = messages
      .filter(m => m.direction === 'in')
      .slice(-3);

    if (recentCustomerMessages.length === 0) return 'neutral';

    let positiveCount = 0;
    let negativeCount = 0;

    recentCustomerMessages.forEach(msg => {
      const text = msg.body.toLowerCase();
      if (/\b(great|good|perfect|love|excellent|interested)\b/.test(text)) {
        positiveCount++;
      } else if (/\b(no|not|don't|can't|won't|bad|terrible|expensive)\b/.test(text)) {
        negativeCount++;
      }
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private determineUrgencyLevel(conversationText: string, buyingSignals: BuyingSignal[]): ConversationAnalysis['urgencyLevel'] {
    const urgencySignals = buyingSignals.filter(s => s.type === 'urgency');
    
    if (urgencySignals.some(s => s.strength > 0.8)) return 'critical';
    if (urgencySignals.some(s => s.strength > 0.6)) return 'high';
    if (urgencySignals.length > 0) return 'medium';
    return 'low';
  }

  private generateNextBestActions(
    stage: ConversationAnalysis['conversationStage'],
    buyingSignals: BuyingSignal[],
    leadTemperature: number
  ): string[] {
    const actions: string[] = [];

    if (leadTemperature > 80) {
      actions.push('Schedule immediate appointment');
      actions.push('Prepare purchase documentation');
    } else if (leadTemperature > 60) {
      actions.push('Schedule test drive');
      actions.push('Send detailed vehicle information');
    }

    switch (stage) {
      case 'discovery':
        actions.push('Ask qualifying questions');
        actions.push('Understand needs and timeline');
        break;
      case 'presentation':
        actions.push('Highlight key features');
        actions.push('Address specific interests');
        break;
      case 'objection_handling':
        actions.push('Address concerns directly');
        actions.push('Provide social proof');
        break;
      case 'closing':
        actions.push('Present financing options');
        actions.push('Create urgency');
        break;
      case 'follow_up':
        actions.push('Schedule follow-up call');
        actions.push('Send additional information');
        break;
    }

    return [...new Set(actions)].slice(0, 4);
  }

  private generateDiscoveryResponses(lastMessage: string, analysis: ConversationAnalysis): AIResponseSuggestion[] {
    return [
      {
        message: "Thanks for your interest! To help me find the perfect vehicle for you, could you tell me what you'll primarily be using it for?",
        confidence: 0.85,
        reasoning: "Discovery stage - need to understand customer needs",
        responseType: 'discovery',
        priority: 'high'
      },
      {
        message: "What's your timeline for making a decision? Are you looking to buy soon or just exploring options?",
        confidence: 0.80,
        reasoning: "Timeline qualification is crucial for prioritization",
        responseType: 'discovery',
        priority: 'high'
      }
    ];
  }

  private generatePresentationResponses(lastMessage: string, analysis: ConversationAnalysis): AIResponseSuggestion[] {
    return [
      {
        message: "This vehicle has exactly what you're looking for. The key features that make it perfect for your needs are...",
        confidence: 0.75,
        reasoning: "Presentation stage - highlight relevant features",
        responseType: 'information',
        priority: 'medium'
      }
    ];
  }

  private generateObjectionResponses(lastMessage: string, analysis: ConversationAnalysis): AIResponseSuggestion[] {
    return [
      {
        message: "I understand your concern. Let me address that directly and show you how we can work together to find a solution.",
        confidence: 0.80,
        reasoning: "Objection handling - acknowledge and address",
        responseType: 'objection_handling',
        priority: 'high'
      }
    ];
  }

  private generateClosingResponses(lastMessage: string, analysis: ConversationAnalysis): AIResponseSuggestion[] {
    return [
      {
        message: "It sounds like this is exactly what you need! I'd love to get you behind the wheel. When would be a good time for you to come in?",
        confidence: 0.90,
        reasoning: "High buying signals detected - time to close",
        responseType: 'closing',
        priority: 'high'
      }
    ];
  }

  private generateFollowUpResponses(lastMessage: string, analysis: ConversationAnalysis): AIResponseSuggestion[] {
    return [
      {
        message: "I completely understand wanting to think it over. What specific information would help you make your decision?",
        confidence: 0.70,
        reasoning: "Follow-up stage - gather information needs",
        responseType: 'follow_up',
        priority: 'medium'
      }
    ];
  }

  private getDefaultAnalysis(): ConversationAnalysis {
    return {
      leadTemperature: 50,
      conversationStage: 'discovery',
      buyingSignals: [],
      sentimentTrend: 'neutral',
      urgencyLevel: 'low',
      nextBestActions: ['Ask qualifying questions', 'Build rapport']
    };
  }
}

export const aiResponseIntelligence = new AIResponseIntelligence();
