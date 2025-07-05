import { supabase } from '@/integrations/supabase/client';

interface QualityScore {
  overall_score: number;
  personalization_score: number;
  relevance_score: number;
  tone_appropriateness_score: number;
  compliance_score: number;
  quality_factors: string[];
  improvement_suggestions: string[];
}

interface QualityMetrics {
  messageId?: string;
  leadId: string;
  messageContent: string;
  leadContext?: any;
  conversationHistory?: any[];
}

export class RealTimeQualityService {
  private static instance: RealTimeQualityService;

  static getInstance(): RealTimeQualityService {
    if (!RealTimeQualityService.instance) {
      RealTimeQualityService.instance = new RealTimeQualityService();
    }
    return RealTimeQualityService.instance;
  }

  // Main quality scoring function
  async scoreMessageQuality(metrics: QualityMetrics): Promise<QualityScore> {
    console.log('🔍 [QUALITY] Scoring message quality for lead:', metrics.leadId);

    const scores = {
      personalization_score: await this.scorePersonalization(metrics),
      relevance_score: await this.scoreRelevance(metrics),
      tone_appropriateness_score: await this.scoreToneAppropriateness(metrics),
      compliance_score: await this.scoreCompliance(metrics)
    };

    const overall_score = this.calculateOverallScore(scores);
    const quality_factors = this.identifyQualityFactors(scores, metrics);
    const improvement_suggestions = this.generateImprovementSuggestions(scores, metrics);

    const qualityScore: QualityScore = {
      overall_score,
      ...scores,
      quality_factors,
      improvement_suggestions
    };

    // Store quality score in database
    await this.storeQualityScore(metrics, qualityScore);

    return qualityScore;
  }

  private async scorePersonalization(metrics: QualityMetrics): Promise<number> {
    let score = 0.5; // Base score

    const { messageContent, leadId } = metrics;
    const lowerContent = messageContent.toLowerCase();

    // Check for customer name usage
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('first_name, last_name')
      .eq('id', leadId)
      .single();

    if (!leadError && leadData) {
      const fullName = `${leadData.first_name} ${leadData.last_name}`.toLowerCase();
      if (lowerContent.includes(leadData.first_name?.toLowerCase() || '')) {
        score += 0.2;
      }
    }

    // Check for personalized preferences
    const { data: preferences, error: prefError } = await supabase
      .from('ai_conversation_preferences')
      .select('*')
      .eq('lead_id', leadId);

    if (!prefError && preferences && preferences.length > 0) {
      // Check if message incorporates learned preferences
      const hasPersonalizedContent = preferences.some(pref => {
        const prefValue = JSON.stringify(pref.preference_value).toLowerCase();
        return lowerContent.includes(prefValue.slice(1, -1)); // Remove quotes
      });

      if (hasPersonalizedContent) {
        score += 0.2;
      }
    }

    // Check for contextual references
    if (lowerContent.includes('as we discussed') || lowerContent.includes('following up')) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private async scoreRelevance(metrics: QualityMetrics): Promise<number> {
    let score = 0.6; // Base score

    const { messageContent, leadId } = metrics;
    const lowerContent = messageContent.toLowerCase();

    // Get lead data for context
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('vehicle_interest, source, status')
      .eq('id', leadId)
      .single();

    if (!leadError && leadData) {
      // Check vehicle interest relevance
      if (leadData.vehicle_interest && leadData.vehicle_interest !== 'General Inquiry') {
        const interest = leadData.vehicle_interest.toLowerCase();
        if (lowerContent.includes(interest) || this.hasVehicleKeywords(lowerContent, interest)) {
          score += 0.2;
        }
      }

      // Check for appointment/next step mentions
      if (lowerContent.includes('appointment') || lowerContent.includes('schedule') || 
          lowerContent.includes('visit') || lowerContent.includes('test drive')) {
        score += 0.1;
      }

      // Check for inventory mentions
      if (lowerContent.includes('available') || lowerContent.includes('in stock') ||
          lowerContent.includes('inventory')) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  private async scoreToneAppropriateness(metrics: QualityMetrics): Promise<number> {
    let score = 0.7; // Base score

    const { messageContent, leadId } = metrics;
    const lowerContent = messageContent.toLowerCase();

    // Get lead's preferred communication style
    const { data: stylePrefs, error } = await supabase
      .from('ai_conversation_preferences')
      .select('preference_value')
      .eq('lead_id', leadId)
      .eq('preference_type', 'communication_style')
      .single();

    if (!error && stylePrefs) {
      const preferredStyle = (stylePrefs.preference_value as any)?.primary_style;
      
      // Check tone alignment
      if (this.checkToneAlignment(lowerContent, preferredStyle)) {
        score += 0.2;
      }
    }

    // Check for professional language
    if (this.hasProfessionalTone(lowerContent)) {
      score += 0.1;
    }

    // Penalize for overly aggressive language
    if (this.hasAggressiveLanguage(lowerContent)) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(score, 1.0));
  }

  private async scoreCompliance(metrics: QualityMetrics): Promise<number> {
    let score = 1.0; // Start with perfect compliance

    const { messageContent } = metrics;
    const lowerContent = messageContent.toLowerCase();

    // Check for compliance violations
    const violations = [];

    // Check for pricing promises without disclaimers
    if ((lowerContent.includes('price') || lowerContent.includes('$')) && 
        !lowerContent.includes('plus tax') && !lowerContent.includes('disclaimer')) {
      violations.push('Missing pricing disclaimer');
      score -= 0.2;
    }

    // Check for guarantee claims
    const guaranteeWords = ['guarantee', 'promise', 'definitely', 'certainly will'];
    if (guaranteeWords.some(word => lowerContent.includes(word))) {
      violations.push('Inappropriate guarantee language');
      score -= 0.3;
    }

    // Check for time pressure tactics
    const pressureWords = ['limited time', 'act now', 'expires today', 'only today'];
    if (pressureWords.some(word => lowerContent.includes(word))) {
      violations.push('High-pressure sales tactics');
      score -= 0.2;
    }

    // Check for appropriate opt-out language
    if (!lowerContent.includes('stop') && !lowerContent.includes('unsubscribe')) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  private calculateOverallScore(scores: Omit<QualityScore, 'overall_score' | 'quality_factors' | 'improvement_suggestions'>): number {
    const weights = {
      personalization_score: 0.25,
      relevance_score: 0.3,
      tone_appropriateness_score: 0.2,
      compliance_score: 0.25
    };

    return Object.entries(scores).reduce((total, [key, value]) => {
      const weight = weights[key as keyof typeof weights];
      return total + (value * weight);
    }, 0);
  }

  private identifyQualityFactors(scores: any, metrics: QualityMetrics): string[] {
    const factors = [];

    if (scores.personalization_score > 0.8) factors.push('Highly Personalized');
    if (scores.relevance_score > 0.8) factors.push('Highly Relevant');
    if (scores.tone_appropriateness_score > 0.8) factors.push('Appropriate Tone');
    if (scores.compliance_score > 0.9) factors.push('Fully Compliant');

    // Add contextual factors
    const lowerContent = metrics.messageContent.toLowerCase();
    if (lowerContent.includes('appointment')) factors.push('Action-Oriented');
    if (lowerContent.includes('available') || lowerContent.includes('inventory')) factors.push('Inventory-Aware');

    return factors;
  }

  private generateImprovementSuggestions(scores: any, metrics: QualityMetrics): string[] {
    const suggestions = [];

    if (scores.personalization_score < 0.6) {
      suggestions.push('Use customer name and reference previous conversations');
    }

    if (scores.relevance_score < 0.6) {
      suggestions.push('Include more specific vehicle information and next steps');
    }

    if (scores.tone_appropriateness_score < 0.6) {
      suggestions.push('Adjust tone to match customer communication style');
    }

    if (scores.compliance_score < 0.8) {
      suggestions.push('Add appropriate disclaimers and avoid guarantee language');
    }

    // Content-specific suggestions
    const lowerContent = metrics.messageContent.toLowerCase();
    if (!lowerContent.includes('appointment') && !lowerContent.includes('schedule')) {
      suggestions.push('Include clear call-to-action for next steps');
    }

    return suggestions;
  }

  private hasVehicleKeywords(content: string, interest: string): boolean {
    const vehicleKeywords = ['car', 'vehicle', 'auto', 'suv', 'truck', 'sedan', 'coupe'];
    const interestKeywords = interest.split(' ');
    
    return vehicleKeywords.some(keyword => content.includes(keyword)) ||
           interestKeywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  private checkToneAlignment(content: string, preferredStyle: string): boolean {
    const formalIndicators = ['thank you', 'appreciate', 'sincerely'];
    const casualIndicators = ['hey', 'thanks', 'cool'];
    
    switch (preferredStyle) {
      case 'formal':
        return formalIndicators.some(indicator => content.includes(indicator));
      case 'casual':
        return casualIndicators.some(indicator => content.includes(indicator));
      default:
        return true; // Default alignment
    }
  }

  private hasProfessionalTone(content: string): boolean {
    const professionalWords = ['please', 'thank you', 'appreciate', 'assist', 'help'];
    return professionalWords.some(word => content.includes(word));
  }

  private hasAggressiveLanguage(content: string): boolean {
    const aggressiveWords = ['must', 'need to act', 'urgent', 'immediately', 'right now'];
    return aggressiveWords.some(word => content.includes(word));
  }

  private async storeQualityScore(metrics: QualityMetrics, qualityScore: QualityScore): Promise<void> {
    const approved = qualityScore.overall_score >= 0.7 && qualityScore.compliance_score >= 0.8;

    await supabase
      .from('ai_quality_scores')
      .insert({
        message_id: metrics.messageId,
        lead_id: metrics.leadId,
        message_content: metrics.messageContent,
        overall_score: qualityScore.overall_score,
        personalization_score: qualityScore.personalization_score,
        relevance_score: qualityScore.relevance_score,
        tone_appropriateness_score: qualityScore.tone_appropriateness_score,
        compliance_score: qualityScore.compliance_score,
        quality_factors: qualityScore.quality_factors,
        improvement_suggestions: qualityScore.improvement_suggestions,
        approved_for_sending: approved,
        reviewed_by_human: false
      });
  }

  // Get quality insights for analytics
  async getQualityInsights(dateRange?: { start: Date; end: Date }): Promise<any> {
    let query = supabase
      .from('ai_quality_scores')
      .select('*');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data: scores, error } = await query.limit(1000);

    if (error || !scores) {
      console.error('Failed to get quality insights:', error);
      return null;
    }

    return this.analyzeQualityTrends(scores);
  }

  private analyzeQualityTrends(scores: any[]): any {
    const avgScores = {
      overall: scores.reduce((sum, s) => sum + s.overall_score, 0) / scores.length,
      personalization: scores.reduce((sum, s) => sum + s.personalization_score, 0) / scores.length,
      relevance: scores.reduce((sum, s) => sum + s.relevance_score, 0) / scores.length,
      tone: scores.reduce((sum, s) => sum + s.tone_appropriateness_score, 0) / scores.length,
      compliance: scores.reduce((sum, s) => sum + s.compliance_score, 0) / scores.length
    };

    const commonFactors = this.getCommonFactors(scores);
    const commonSuggestions = this.getCommonSuggestions(scores);

    return {
      average_scores: avgScores,
      total_messages_scored: scores.length,
      approval_rate: scores.filter(s => s.approved_for_sending).length / scores.length,
      common_quality_factors: commonFactors,
      common_improvement_areas: commonSuggestions
    };
  }

  private getCommonFactors(scores: any[]): any[] {
    const factorCounts = {};
    
    scores.forEach(score => {
      score.quality_factors?.forEach((factor: string) => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });
    });

    return Object.entries(factorCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([factor, count]) => ({ factor, count }));
  }

  private getCommonSuggestions(scores: any[]): any[] {
    const suggestionCounts = {};
    
    scores.forEach(score => {
      score.improvement_suggestions?.forEach((suggestion: string) => {
        suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1;
      });
    });

    return Object.entries(suggestionCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([suggestion, count]) => ({ suggestion, count }));
  }
}

export const realTimeQualityService = RealTimeQualityService.getInstance();