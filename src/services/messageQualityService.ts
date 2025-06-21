import { supabase } from '@/integrations/supabase/client';

export interface MessageQualityMetrics {
  overallScore: number;
  lengthScore: number;
  personalizationScore: number;
  clarityScore: number;
  actionabilityScore: number;
  complianceScore: number;
  suggestions: string[];
}

export interface MessageAnalytics {
  messageId: string;
  leadId: string;
  content: string;
  qualityScore: number;
  responseReceived: boolean;
  responseTimeHours?: number;
  sentAt: Date;
  messageType: string;
}

class MessageQualityService {
  // Analyze message quality before sending
  async analyzeMessageQuality(
    message: string, 
    leadId: string, 
    context?: any
  ): Promise<MessageQualityMetrics> {
    const metrics: MessageQualityMetrics = {
      overallScore: 0,
      lengthScore: this.scoreLengthOptimization(message),
      personalizationScore: this.scorePersonalization(message, context),
      clarityScore: this.scoreClarity(message),
      actionabilityScore: this.scoreActionability(message),
      complianceScore: this.scoreCompliance(message),
      suggestions: []
    };

    // Calculate overall score
    metrics.overallScore = Math.round(
      (metrics.lengthScore + 
       metrics.personalizationScore + 
       metrics.clarityScore + 
       metrics.actionabilityScore + 
       metrics.complianceScore) / 5
    );

    // Generate suggestions
    metrics.suggestions = this.generateSuggestions(metrics, message);

    // Log quality metrics
    await this.logQualityMetrics(leadId, message, metrics);

    return metrics;
  }

  // Score message length optimization (SMS-friendly)
  private scoreLengthOptimization(message: string): number {
    const length = message.length;
    
    if (length <= 160) return 100; // Perfect for SMS
    if (length <= 200) return 85;  // Good
    if (length <= 300) return 70;  // Acceptable
    if (length <= 500) return 50;  // Too long
    return 25; // Way too long
  }

  // Score personalization elements
  private scorePersonalization(message: string, context?: any): number {
    let score = 50; // Base score
    
    // Check for name usage
    if (message.match(/Hi\s+\w+|Hello\s+\w+/)) score += 25;
    
    // Check for vehicle interest mention
    if (context?.vehicleInterest && message.toLowerCase().includes(context.vehicleInterest.toLowerCase())) {
      score += 15;
    }
    
    // Check for personalized details
    if (message.includes('your') || message.includes('you\'re')) score += 10;
    
    return Math.min(100, score);
  }

  // Score message clarity and readability
  private scoreClarity(message: string): number {
    let score = 70; // Base score
    
    // Check sentence length
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    
    if (avgSentenceLength <= 50) score += 15; // Clear, concise sentences
    else if (avgSentenceLength <= 80) score += 10;
    else score -= 10; // Too complex
    
    // Check for clear structure
    if (message.includes('?')) score += 10; // Has questions
    if (sentences.length <= 3) score += 5; // Not too many sentences
    
    // Penalize for confusion words
    const confusionWords = ['maybe', 'possibly', 'might', 'perhaps'];
    confusionWords.forEach(word => {
      if (message.toLowerCase().includes(word)) score -= 5;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  // Score actionability (clear next steps)
  private scoreActionability(message: string): number {
    let score = 40; // Base score
    
    const actionWords = [
      'call', 'visit', 'come in', 'schedule', 'book', 'reply',
      'let me know', 'contact', 'reach out', 'stop by'
    ];
    
    const hasAction = actionWords.some(word => 
      message.toLowerCase().includes(word)
    );
    
    if (hasAction) score += 40;
    
    // Bonus for questions (encourage response)
    if (message.includes('?')) score += 20;
    
    return Math.min(100, score);
  }

  // Score compliance with regulations
  private scoreCompliance(message: string): number {
    let score = 100; // Start perfect, deduct for issues
    
    // Check for aggressive language
    const aggressiveWords = ['must', 'urgent', 'now', 'immediately', 'last chance'];
    aggressiveWords.forEach(word => {
      if (message.toLowerCase().includes(word)) score -= 10;
    });
    
    // Check for misleading claims
    const misleadingPhrases = ['guaranteed', 'no credit check', 'everyone approved'];
    misleadingPhrases.forEach(phrase => {
      if (message.toLowerCase().includes(phrase)) score -= 20;
    });
    
    // Check for excessive punctuation
    if (message.includes('!!!') || message.includes('???')) score -= 5;
    
    return Math.max(0, score);
  }

  // Generate improvement suggestions
  private generateSuggestions(metrics: MessageQualityMetrics, message: string): string[] {
    const suggestions: string[] = [];
    
    if (metrics.lengthScore < 80) {
      suggestions.push('Consider shortening the message for better SMS delivery');
    }
    
    if (metrics.personalizationScore < 70) {
      suggestions.push('Add the lead\'s name or reference their vehicle interest');
    }
    
    if (metrics.clarityScore < 70) {
      suggestions.push('Simplify language and use shorter sentences');
    }
    
    if (metrics.actionabilityScore < 60) {
      suggestions.push('Include a clear call-to-action or question');
    }
    
    if (metrics.complianceScore < 90) {
      suggestions.push('Remove aggressive or misleading language');
    }
    
    if (metrics.overallScore >= 85) {
      suggestions.push('Excellent message quality! Ready to send.');
    }
    
    return suggestions;
  }

  // Log quality metrics for analysis
  private async logQualityMetrics(leadId: string, message: string, metrics: MessageQualityMetrics) {
    try {
      await supabase
        .from('ai_message_analytics')
        .insert({
          lead_id: leadId,
          message_content: message,
          message_stage: 'quality_analysis',
          sent_at: new Date().toISOString(),
          inventory_mentioned: {
            qualityScore: metrics.overallScore,
            lengthScore: metrics.lengthScore,
            personalizationScore: metrics.personalizationScore,
            clarityScore: metrics.clarityScore,
            actionabilityScore: metrics.actionabilityScore,
            complianceScore: metrics.complianceScore
          }
        });
    } catch (error) {
      console.error('Error logging quality metrics:', error);
    }
  }

  // Track message performance after sending
  async trackMessagePerformance(
    messageId: string,
    leadId: string,
    responseReceived: boolean,
    responseTimeHours?: number
  ) {
    try {
      // Update analytics with performance data
      await supabase
        .from('ai_message_analytics')
        .update({
          responded_at: responseReceived ? new Date().toISOString() : null,
          response_time_hours: responseTimeHours
        })
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(1);

      console.log(`📊 [QUALITY] Tracked performance for lead ${leadId}: response=${responseReceived}`);
    } catch (error) {
      console.error('Error tracking message performance:', error);
    }
  }

  // Get quality insights for optimization
  async getQualityInsights(): Promise<{
    averageQuality: number;
    bestPerformingTypes: string[];
    improvementAreas: string[];
  }> {
    try {
      const { data: analytics } = await supabase
        .from('ai_message_analytics')
        .select('*')
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (!analytics || analytics.length === 0) {
        return {
          averageQuality: 0,
          bestPerformingTypes: [],
          improvementAreas: []
        };
      }

      // Calculate average quality with safe type checking
      const qualityScores = analytics
        .map(a => {
          if (a.inventory_mentioned && typeof a.inventory_mentioned === 'object' && a.inventory_mentioned !== null) {
            const inventoryData = a.inventory_mentioned as any;
            return typeof inventoryData.qualityScore === 'number' ? inventoryData.qualityScore : null;
          }
          return null;
        })
        .filter((score): score is number => score !== null);
      
      const averageQuality = qualityScores.length > 0 
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
        : 0;

      // Identify best performing message types
      const typePerformance: { [key: string]: { total: number; responses: number } } = {};
      analytics.forEach(a => {
        const type = a.message_stage || 'unknown';
        if (!typePerformance[type]) {
          typePerformance[type] = { total: 0, responses: 0 };
        }
        typePerformance[type].total++;
        if (a.responded_at) typePerformance[type].responses++;
      });

      const bestPerformingTypes = Object.entries(typePerformance)
        .sort(([,a], [,b]) => (b.responses / b.total) - (a.responses / a.total))
        .slice(0, 3)
        .map(([type]) => type);

      // Identify improvement areas
      const improvementAreas: string[] = [];
      if (averageQuality < 70) improvementAreas.push('Overall message quality');
      if (qualityScores.filter(s => s < 60).length > qualityScores.length * 0.3) {
        improvementAreas.push('Message personalization');
      }

      return {
        averageQuality: Math.round(averageQuality),
        bestPerformingTypes,
        improvementAreas
      };
    } catch (error) {
      console.error('Error getting quality insights:', error);
      return {
        averageQuality: 0,
        bestPerformingTypes: [],
        improvementAreas: []
      };
    }
  }
}

export const messageQualityService = new MessageQualityService();
