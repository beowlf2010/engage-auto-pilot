import { supabase } from '@/integrations/supabase/client';

export interface QualityMetrics {
  overall: number;
  personalization: number;
  relevance: number;
  tone: number;
  engagement: number;
  compliance: number;
  clarity: number;
  length: number;
}

export interface QualityAssessment {
  score: number;
  metrics: QualityMetrics;
  recommendations: string[];
  blockers: string[];
  approved: boolean;
  reasoning: string;
}

export interface LeadContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  conversationHistory: string[];
  leadData: {
    city?: string;
    state?: string;
    status?: string;
    source?: string;
  };
}

export class EnhancedQualityScoring {
  private readonly QUALITY_THRESHOLDS = {
    EXCELLENT: 85,
    GOOD: 70,
    ACCEPTABLE: 60,
    POOR: 40
  };

  private readonly BLOCKING_PHRASES = [
    'guarantee',
    'promise',
    'definitely will',
    'no money down',
    'free',
    'limited time only',
    'act now',
    'must buy today'
  ];

  async assessMessageQuality(
    message: string, 
    context: LeadContext
  ): Promise<QualityAssessment> {
    try {
      console.log('🔍 [QUALITY] Assessing message quality for lead:', context.leadId);
      
      const metrics = this.calculateDetailedMetrics(message, context);
      const overall = this.calculateOverallScore(metrics);
      const recommendations = this.generateRecommendations(metrics, context);
      const blockers = this.identifyBlockers(message);
      
      const assessment: QualityAssessment = {
        score: overall,
        metrics,
        recommendations,
        blockers,
        approved: overall >= this.QUALITY_THRESHOLDS.ACCEPTABLE && blockers.length === 0,
        reasoning: this.generateReasoning(metrics, overall, blockers)
      };

      // Store quality assessment in database
      await this.storeQualityAssessment(message, context.leadId, assessment);
      
      console.log('✅ [QUALITY] Assessment complete:', {
        score: overall,
        approved: assessment.approved,
        blockers: blockers.length
      });

      return assessment;
    } catch (error) {
      console.error('❌ [QUALITY] Error assessing quality:', error);
      
      // Return safe fallback
      return {
        score: 0,
        metrics: this.getDefaultMetrics(),
        recommendations: ['Unable to assess quality - manual review required'],
        blockers: ['Quality assessment failed'],
        approved: false,
        reasoning: 'Quality assessment system error'
      };
    }
  }

  private calculateDetailedMetrics(message: string, context: LeadContext): QualityMetrics {
    const personalization = this.assessPersonalization(message, context);
    const relevance = this.assessRelevance(message, context);
    const tone = this.assessTone(message);
    const engagement = this.assessEngagement(message);
    const compliance = this.assessCompliance(message);
    const clarity = this.assessClarity(message);
    const length = this.assessLength(message);

    return {
      overall: 0, // Will be calculated separately
      personalization,
      relevance,
      tone,
      engagement,
      compliance,
      clarity,
      length
    };
  }

  private assessPersonalization(message: string, context: LeadContext): number {
    let score = 0;
    
    // Check for lead name usage
    const firstName = context.leadName.split(' ')[0];
    if (firstName && message.toLowerCase().includes(firstName.toLowerCase())) {
      score += 25;
    }

    // Check for vehicle interest mention
    if (context.vehicleInterest && 
        message.toLowerCase().includes(context.vehicleInterest.toLowerCase())) {
      score += 25;
    }

    // Check for location awareness
    if (context.leadData.city && 
        message.toLowerCase().includes(context.leadData.city.toLowerCase())) {
      score += 20;
    }

    // Check for conversation context
    if (context.conversationHistory.length > 0) {
      const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
      if (this.referencesContext(message, lastMessage)) {
        score += 30;
      }
    } else {
      // For initial contact, check for appropriate introduction
      if (message.toLowerCase().includes('hello') || 
          message.toLowerCase().includes('hi') ||
          message.toLowerCase().includes('thank you for your interest')) {
        score += 30;
      }
    }

    return Math.min(score, 100);
  }

  private assessRelevance(message: string, context: LeadContext): number {
    let score = 50; // Base relevance
    
    const messageLower = message.toLowerCase();
    
    // Vehicle-related keywords
    const vehicleKeywords = [
      'car', 'vehicle', 'truck', 'suv', 'sedan', 'coupe', 'hybrid', 'electric',
      'price', 'financing', 'payment', 'lease', 'buy', 'purchase',
      'test drive', 'appointment', 'availability', 'features', 'options',
      'warranty', 'service', 'maintenance', 'trade-in'
    ];

    const keywordMatches = vehicleKeywords.filter(keyword => 
      messageLower.includes(keyword)
    ).length;

    score += Math.min(keywordMatches * 5, 30);

    // Lead status relevance
    if (context.leadData.status === 'new' && messageLower.includes('welcome')) score += 10;
    if (context.leadData.status === 'contacted' && messageLower.includes('follow')) score += 10;
    if (context.leadData.status === 'qualified' && messageLower.includes('next')) score += 10;

    // Avoid off-topic content
    const offTopicKeywords = ['weather', 'politics', 'personal', 'unrelated'];
    if (offTopicKeywords.some(keyword => messageLower.includes(keyword))) {
      score -= 20;
    }

    return Math.max(Math.min(score, 100), 0);
  }

  private assessTone(message: string): number {
    const messageLower = message.toLowerCase();
    let score = 70; // Start with neutral/professional tone
    
    // Positive indicators
    const positiveWords = [
      'happy', 'pleased', 'excited', 'great', 'wonderful', 'fantastic',
      'help', 'assist', 'support', 'welcome', 'thank you'
    ];
    
    const negativeWords = [
      'unfortunately', 'can\'t', 'won\'t', 'impossible', 'difficult',
      'problem', 'issue', 'trouble', 'sorry'
    ];
    
    const professionalWords = [
      'would', 'could', 'please', 'kindly', 'appreciate', 'understand'
    ];

    positiveWords.forEach(word => {
      if (messageLower.includes(word)) score += 5;
    });

    negativeWords.forEach(word => {
      if (messageLower.includes(word)) score -= 10;
    });

    professionalWords.forEach(word => {
      if (messageLower.includes(word)) score += 3;
    });

    // Check for overly casual language
    const casualWords = ['hey', 'yeah', 'yep', 'nope', 'totally', 'awesome'];
    casualWords.forEach(word => {
      if (messageLower.includes(word)) score -= 5;
    });

    // Check for all caps (aggressive)
    if (message === message.toUpperCase() && message.length > 10) {
      score -= 30;
    }

    return Math.max(Math.min(score, 100), 0);
  }

  private assessEngagement(message: string): number {
    let score = 0;
    
    // Questions encourage engagement
    const questionCount = (message.match(/\?/g) || []).length;
    score += Math.min(questionCount * 15, 30);

    // Call-to-action phrases
    const ctaPatterns = [
      'would you like', 'are you interested', 'let me know', 'feel free',
      'when would', 'would you prefer', 'what do you think'
    ];
    
    ctaPatterns.forEach(pattern => {
      if (message.toLowerCase().includes(pattern)) score += 10;
    });

    // Interactive elements
    if (message.toLowerCase().includes('call') || 
        message.toLowerCase().includes('visit') ||
        message.toLowerCase().includes('appointment')) {
      score += 15;
    }

    // Conversation continuers
    const continuers = [
      'also', 'additionally', 'furthermore', 'by the way',
      'speaking of', 'regarding', 'about'
    ];
    
    continuers.forEach(continuer => {
      if (message.toLowerCase().includes(continuer)) score += 5;
    });

    return Math.min(score, 100);
  }

  private assessCompliance(message: string): number {
    let score = 100; // Start with full compliance
    
    // Check for blocking phrases
    this.BLOCKING_PHRASES.forEach(phrase => {
      if (message.toLowerCase().includes(phrase)) {
        score -= 25;
      }
    });

    // Required disclaimers for certain content
    if (message.toLowerCase().includes('financing') && 
        !message.toLowerCase().includes('approved credit')) {
      score -= 15;
    }

    if (message.toLowerCase().includes('price') && 
        !message.toLowerCase().includes('plus')) {
      score -= 10;
    }

    // Excessive promotional language
    const promoWords = ['best', 'lowest', 'guaranteed', 'unbeatable'];
    promoWords.forEach(word => {
      if (message.toLowerCase().includes(word)) score -= 10;
    });

    return Math.max(score, 0);
  }

  private assessClarity(message: string): number {
    let score = 50;
    
    // Sentence structure
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = message.length / sentences.length;
    
    if (avgSentenceLength > 20 && avgSentenceLength < 100) score += 20;
    if (avgSentenceLength > 100) score -= 10;
    
    // Complex words penalty
    const complexWords = message.split(' ').filter(word => word.length > 12);
    score -= Math.min(complexWords.length * 3, 15);
    
    // Grammar indicators (simple checks)
    const grammarIssues = [
      message.includes(',,'), // Double commas
      message.includes('..'), // Double periods
      /\s{2,}/.test(message), // Multiple spaces
      message.includes('your welcome'), // Common error
      message.includes('there going') // Common error
    ].filter(Boolean).length;
    
    score -= grammarIssues * 10;

    return Math.max(Math.min(score, 100), 0);
  }

  private assessLength(message: string): number {
    const length = message.length;
    
    // Optimal length for SMS: 80-160 characters
    if (length >= 80 && length <= 160) return 100;
    if (length >= 60 && length <= 200) return 85;
    if (length >= 40 && length <= 240) return 70;
    if (length < 20) return 30;
    if (length > 300) return 20;
    
    return 50;
  }

  private calculateOverallScore(metrics: QualityMetrics): number {
    // Weighted scoring system
    const weights = {
      personalization: 0.20,
      relevance: 0.20,
      tone: 0.15,
      engagement: 0.15,
      compliance: 0.15,
      clarity: 0.10,
      length: 0.05
    };

    let weightedScore = 0;
    Object.entries(weights).forEach(([metric, weight]) => {
      weightedScore += metrics[metric as keyof QualityMetrics] * weight;
    });

    return Math.round(weightedScore);
  }

  private generateRecommendations(metrics: QualityMetrics, context: LeadContext): string[] {
    const recommendations: string[] = [];
    
    if (metrics.personalization < 60) {
      recommendations.push(`Include "${context.leadName.split(' ')[0]}" to personalize the message`);
    }
    
    if (metrics.relevance < 60) {
      recommendations.push(`Reference "${context.vehicleInterest}" to improve relevance`);
    }
    
    if (metrics.tone < 70) {
      recommendations.push('Use more positive and professional language');
    }
    
    if (metrics.engagement < 50) {
      recommendations.push('Add a question or call-to-action to encourage response');
    }
    
    if (metrics.compliance < 90) {
      recommendations.push('Remove promotional language or add required disclaimers');
    }
    
    if (metrics.clarity < 70) {
      recommendations.push('Simplify language and shorten sentences for better clarity');
    }
    
    if (metrics.length < 50) {
      recommendations.push('Adjust message length for optimal SMS delivery');
    }

    return recommendations;
  }

  private identifyBlockers(message: string): string[] {
    const blockers: string[] = [];
    
    this.BLOCKING_PHRASES.forEach(phrase => {
      if (message.toLowerCase().includes(phrase)) {
        blockers.push(`Contains prohibited phrase: "${phrase}"`);
      }
    });

    // Check for potential legal issues
    if (message.toLowerCase().includes('guaranteed approval')) {
      blockers.push('Cannot guarantee credit approval');
    }

    if (message.toLowerCase().includes('no credit check')) {
      blockers.push('Misleading credit information');
    }

    return blockers;
  }

  private generateReasoning(metrics: QualityMetrics, overall: number, blockers: string[]): string {
    if (blockers.length > 0) {
      return `Message blocked due to compliance issues: ${blockers.join(', ')}`;
    }

    if (overall >= this.QUALITY_THRESHOLDS.EXCELLENT) {
      return 'High-quality message with strong personalization and engagement';
    }

    if (overall >= this.QUALITY_THRESHOLDS.GOOD) {
      return 'Good message quality with minor areas for improvement';
    }

    if (overall >= this.QUALITY_THRESHOLDS.ACCEPTABLE) {
      return 'Acceptable quality but could benefit from enhancement';
    }

    return 'Message quality below threshold - requires revision';
  }

  private referencesContext(message: string, lastMessage: string): boolean {
    const messageWords = message.toLowerCase().split(' ');
    const lastMessageWords = lastMessage.toLowerCase().split(' ');
    
    // Check for common words (excluding stop words)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const contextWords = lastMessageWords.filter(word => 
      word.length > 3 && !stopWords.includes(word)
    );
    
    return contextWords.some(word => messageWords.includes(word));
  }

  private async storeQualityAssessment(
    message: string, 
    leadId: string, 
    assessment: QualityAssessment
  ): Promise<void> {
    try {
      await supabase.from('ai_quality_scores').insert({
        lead_id: leadId,
        message_content: message,
        overall_score: assessment.score,
        personalization_score: assessment.metrics.personalization,
        relevance_score: assessment.metrics.relevance,
        tone_appropriateness_score: assessment.metrics.tone,
        compliance_score: assessment.metrics.compliance,
        approved_for_sending: assessment.approved,
        quality_factors: JSON.parse(JSON.stringify({
          metrics: assessment.metrics,
          recommendations: assessment.recommendations,
          blockers: assessment.blockers,
          reasoning: assessment.reasoning
        }))
      });
    } catch (error) {
      console.error('❌ [QUALITY] Error storing assessment:', error);
    }
  }

  private getDefaultMetrics(): QualityMetrics {
    return {
      overall: 0,
      personalization: 0,
      relevance: 0,
      tone: 0,
      engagement: 0,
      compliance: 0,
      clarity: 0,
      length: 0
    };
  }
}

export const enhancedQualityScoring = new EnhancedQualityScoring();