import { supabase } from '@/integrations/supabase/client';

export interface SentimentMetrics {
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  engagement: 'disengaged' | 'neutral' | 'engaged' | 'highly_engaged';
  intent: 'browsing' | 'researching' | 'shopping' | 'ready_to_buy';
  emotional_state: 'frustrated' | 'confused' | 'interested' | 'excited' | 'satisfied';
  priority_score: number; // 1-100
}

export interface UrgencyIndicators {
  timeConstraints: string[];
  competitionMentions: string[];
  decisionSignals: string[];
  concernsRaised: string[];
  positiveSignals: string[];
}

export interface ConversationContext {
  leadId: string;
  messages: Array<{
    content: string;
    direction: 'in' | 'out';
    timestamp: string;
  }>;
  leadData: {
    status: string;
    daysInFunnel: number;
    lastResponseTime?: number;
  };
}

export class ConversationSentimentAnalysis {
  private readonly URGENCY_KEYWORDS = {
    critical: [
      'today', 'right now', 'immediately', 'asap', 'urgent',
      'deadline', 'need by', 'must have', 'closing soon'
    ],
    high: [
      'this week', 'soon', 'quickly', 'in a hurry', 'time sensitive',
      'other dealers', 'competitor', 'better offer', 'shopping around'
    ],
    medium: [
      'next week', 'next month', 'thinking about', 'considering',
      'looking at options', 'comparing', 'researching'
    ],
    low: [
      'sometime', 'eventually', 'maybe', 'future', 'when ready',
      'not sure', 'just browsing', 'just looking'
    ]
  };

  private readonly ENGAGEMENT_INDICATORS = {
    highly_engaged: [
      'excited', 'perfect', 'exactly what', 'love it', 'amazing',
      'when can I', 'how do I', 'what\'s next', 'ready to'
    ],
    engaged: [
      'interested', 'sounds good', 'tell me more', 'good option',
      'like that', 'works for me', 'that helps'
    ],
    neutral: [
      'okay', 'I see', 'understand', 'thanks', 'got it'
    ],
    disengaged: [
      'not interested', 'too expensive', 'not right', 'changed mind',
      'not what I want', 'looking elsewhere', 'not ready'
    ]
  };

  private readonly INTENT_SIGNALS = {
    ready_to_buy: [
      'buy today', 'ready to purchase', 'take it', 'deal done',
      'where do I sign', 'financing options', 'payment plans',
      'trade in value', 'final price'
    ],
    shopping: [
      'best price', 'other options', 'compare', 'competitors',
      'other dealers', 'shopping around', 'better deal'
    ],
    researching: [
      'more information', 'specifications', 'features', 'reviews',
      'reliability', 'maintenance costs', 'fuel economy'
    ],
    browsing: [
      'just looking', 'checking out', 'seeing what\'s available',
      'browsing', 'exploring options', 'not decided'
    ]
  };

  async analyzeConversationSentiment(context: ConversationContext): Promise<SentimentMetrics> {
    try {
      console.log('🎯 [SENTIMENT] Analyzing conversation for lead:', context.leadId);
      
      const customerMessages = context.messages.filter(m => m.direction === 'in');
      
      if (customerMessages.length === 0) {
        return this.getDefaultSentiment();
      }

      const latestMessage = customerMessages[customerMessages.length - 1];
      const allCustomerText = customerMessages.map(m => m.content).join(' ');

      const urgency = this.analyzeUrgency(allCustomerText, context.leadData);
      const engagement = this.analyzeEngagement(allCustomerText, customerMessages.length);
      const intent = this.analyzeIntent(allCustomerText);
      const emotional_state = this.analyzeEmotionalState(latestMessage.content);
      const overall = this.determineSentiment(allCustomerText, engagement);
      
      const priority_score = this.calculatePriorityScore(
        urgency, 
        engagement, 
        intent, 
        context.leadData.daysInFunnel,
        context.leadData.lastResponseTime
      );

      const sentiment: SentimentMetrics = {
        overall,
        confidence: this.calculateConfidence(customerMessages.length, allCustomerText.length),
        urgency,
        engagement,
        intent,
        emotional_state,
        priority_score
      };

      // Store sentiment analysis
      await this.storeSentimentAnalysis(context.leadId, sentiment, latestMessage.content);
      
      console.log('✅ [SENTIMENT] Analysis complete:', {
        urgency,
        engagement,
        priority: priority_score
      });

      return sentiment;
    } catch (error) {
      console.error('❌ [SENTIMENT] Error analyzing sentiment:', error);
      return this.getDefaultSentiment();
    }
  }

  private analyzeUrgency(text: string, leadData: any): 'low' | 'medium' | 'high' | 'critical' {
    const textLower = text.toLowerCase();
    
    // Check for critical urgency first
    if (this.URGENCY_KEYWORDS.critical.some(keyword => textLower.includes(keyword))) {
      return 'critical';
    }
    
    if (this.URGENCY_KEYWORDS.high.some(keyword => textLower.includes(keyword))) {
      return 'high';
    }
    
    if (this.URGENCY_KEYWORDS.medium.some(keyword => textLower.includes(keyword))) {
      return 'medium';
    }
    
    // Consider lead age for urgency
    if (leadData.daysInFunnel > 30) {
      return 'low'; // Older leads less urgent
    }
    
    if (leadData.daysInFunnel < 7) {
      return 'medium'; // New leads have medium urgency
    }
    
    return 'low';
  }

  private analyzeEngagement(text: string, messageCount: number): 'disengaged' | 'neutral' | 'engaged' | 'highly_engaged' {
    const textLower = text.toLowerCase();
    
    // Check for disengagement signals
    if (this.ENGAGEMENT_INDICATORS.disengaged.some(keyword => textLower.includes(keyword))) {
      return 'disengaged';
    }
    
    // Check for high engagement
    if (this.ENGAGEMENT_INDICATORS.highly_engaged.some(keyword => textLower.includes(keyword))) {
      return 'highly_engaged';
    }
    
    // Check for regular engagement
    if (this.ENGAGEMENT_INDICATORS.engaged.some(keyword => textLower.includes(keyword))) {
      return 'engaged';
    }
    
    // Consider message frequency
    if (messageCount > 5) {
      return 'engaged'; // Multiple messages indicate engagement
    }
    
    if (messageCount > 10) {
      return 'highly_engaged';
    }
    
    return 'neutral';
  }

  private analyzeIntent(text: string): 'browsing' | 'researching' | 'shopping' | 'ready_to_buy' {
    const textLower = text.toLowerCase();
    
    // Check for buying intent (highest priority)
    if (this.INTENT_SIGNALS.ready_to_buy.some(keyword => textLower.includes(keyword))) {
      return 'ready_to_buy';
    }
    
    // Check for shopping intent
    if (this.INTENT_SIGNALS.shopping.some(keyword => textLower.includes(keyword))) {
      return 'shopping';
    }
    
    // Check for research intent
    if (this.INTENT_SIGNALS.researching.some(keyword => textLower.includes(keyword))) {
      return 'researching';
    }
    
    // Default to browsing
    return 'browsing';
  }

  private analyzeEmotionalState(latestMessage: string): 'frustrated' | 'confused' | 'interested' | 'excited' | 'satisfied' {
    const textLower = latestMessage.toLowerCase();
    
    // Frustration indicators
    const frustrationWords = ['frustrated', 'annoyed', 'difficult', 'complicated', 'problem', 'issue'];
    if (frustrationWords.some(word => textLower.includes(word))) {
      return 'frustrated';
    }
    
    // Confusion indicators
    const confusionWords = ['confused', 'don\'t understand', 'unclear', 'not sure', 'what does', 'how does'];
    if (confusionWords.some(word => textLower.includes(word))) {
      return 'confused';
    }
    
    // Excitement indicators
    const excitementWords = ['excited', 'amazing', 'perfect', 'love', 'fantastic', 'awesome'];
    if (excitementWords.some(word => textLower.includes(word))) {
      return 'excited';
    }
    
    // Satisfaction indicators
    const satisfactionWords = ['happy', 'satisfied', 'pleased', 'good', 'great', 'thank you'];
    if (satisfactionWords.some(word => textLower.includes(word))) {
      return 'satisfied';
    }
    
    return 'interested';
  }

  private determineSentiment(text: string, engagement: string): 'positive' | 'neutral' | 'negative' {
    const textLower = text.toLowerCase();
    
    // Strong negative indicators
    const negativeWords = [
      'disappointed', 'frustrated', 'angry', 'terrible', 'awful', 
      'hate', 'worst', 'never', 'not interested', 'waste of time'
    ];
    
    // Strong positive indicators
    const positiveWords = [
      'excellent', 'amazing', 'perfect', 'love', 'fantastic', 
      'great', 'wonderful', 'impressed', 'satisfied', 'happy'
    ];
    
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    
    if (engagement === 'disengaged' || negativeCount > positiveCount + 1) {
      return 'negative';
    }
    
    if (engagement === 'highly_engaged' || positiveCount > negativeCount + 1) {
      return 'positive';
    }
    
    return 'neutral';
  }

  private calculatePriorityScore(
    urgency: string,
    engagement: string, 
    intent: string,
    daysInFunnel: number,
    lastResponseTime?: number
  ): number {
    let score = 50; // Base score
    
    // Urgency scoring
    switch (urgency) {
      case 'critical': score += 30; break;
      case 'high': score += 20; break;
      case 'medium': score += 10; break;
      case 'low': score -= 10; break;
    }
    
    // Engagement scoring
    switch (engagement) {
      case 'highly_engaged': score += 25; break;
      case 'engaged': score += 15; break;
      case 'neutral': score += 0; break;
      case 'disengaged': score -= 20; break;
    }
    
    // Intent scoring
    switch (intent) {
      case 'ready_to_buy': score += 30; break;
      case 'shopping': score += 20; break;
      case 'researching': score += 10; break;
      case 'browsing': score += 0; break;
    }
    
    // Time-based adjustments
    if (daysInFunnel < 3) score += 10; // New leads get priority
    if (daysInFunnel > 14) score -= 5; // Older leads lower priority
    
    // Response time penalty
    if (lastResponseTime && lastResponseTime > 24) {
      score += 15; // Overdue responses get higher priority
    }
    
    return Math.max(Math.min(score, 100), 1);
  }

  private calculateConfidence(messageCount: number, textLength: number): number {
    let confidence = 0.5; // Base confidence
    
    // More messages = higher confidence
    if (messageCount >= 5) confidence += 0.3;
    else if (messageCount >= 3) confidence += 0.2;
    else if (messageCount >= 2) confidence += 0.1;
    
    // More text = higher confidence
    if (textLength >= 200) confidence += 0.2;
    else if (textLength >= 100) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  async identifyUrgentLeads(limit: number = 10): Promise<Array<{
    leadId: string;
    priorityScore: number;
    urgency: string;
    reasoning: string;
  }>> {
    try {
      // Use existing ai_conversation_context table
      const { data: urgentAnalyses, error } = await supabase
        .from('ai_conversation_context')
        .select(`
          lead_id,
          context_score,
          last_interaction_type,
          updated_at
        `)
        .gte('context_score', 70)
        .order('context_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (urgentAnalyses || []).map((analysis: any) => ({
        leadId: analysis.lead_id,
        priorityScore: analysis.context_score || 50,
        urgency: 'medium',
        reasoning: `High context score (${analysis.context_score})`
      }));
    } catch (error) {
      console.error('❌ [SENTIMENT] Error identifying urgent leads:', error);
      return [];
    }
  }

  private generateUrgencyReasoning(analysis: any): string {
    const reasons = [];
    
    if (analysis.priority_score >= 90) reasons.push('Critical priority');
    if (analysis.urgency_level === 'critical') reasons.push('Time-sensitive request');
    if (analysis.sentiment_data?.intent === 'ready_to_buy') reasons.push('Ready to purchase');
    if (analysis.sentiment_data?.engagement === 'highly_engaged') reasons.push('Highly engaged customer');
    
    return reasons.join(', ') || 'High priority lead';
  }

  private async storeSentimentAnalysis(
    leadId: string, 
    sentiment: SentimentMetrics, 
    latestMessage: string
  ): Promise<void> {
    try {
      // Store in existing ai_conversation_context table
      await supabase.from('ai_conversation_context').upsert({
        lead_id: leadId,
        context_score: sentiment.priority_score,
        last_interaction_type: sentiment.intent,
        response_style: sentiment.overall,
        conversation_summary: `Sentiment: ${sentiment.overall}, Urgency: ${sentiment.urgency}, Intent: ${sentiment.intent}`,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [SENTIMENT] Error storing analysis:', error);
    }
  }

  private getDefaultSentiment(): SentimentMetrics {
    return {
      overall: 'neutral',
      confidence: 0.5,
      urgency: 'medium',
      engagement: 'neutral',
      intent: 'browsing',
      emotional_state: 'interested',
      priority_score: 50
    };
  }
}

export const conversationSentimentAnalysis = new ConversationSentimentAnalysis();