import { supabase } from '@/integrations/supabase/client';

interface PerformancePrediction {
  messageId?: string;
  leadId: string;
  predictedResponseRate: number;
  predictedResponseTime: number;
  predictedConversionProbability: number;
  optimalSendTime: Date;
  confidenceScore: number;
  contributingFactors: string[];
  recommendations: string[];
}

interface LeadEngagementProfile {
  leadId: string;
  averageResponseTime: number;
  responseRate: number;
  preferredContactHours: number[];
  engagementPattern: 'high' | 'medium' | 'low';
  conversionIndicators: string[];
  lastEngagementTime: Date;
  totalInteractions: number;
  positiveInteractions: number;
}

interface TemplatePerformanceProfile {
  templateHash: string;
  globalResponseRate: number;
  globalConversionRate: number;
  optimalTimingWindows: number[];
  successfulLeadSegments: string[];
  averageResponseTime: number;
  seasonalVariations: Record<string, number>;
}

export class PredictivePerformanceEngine {
  private static instance: PredictivePerformanceEngine;
  private leadProfiles = new Map<string, LeadEngagementProfile>();
  private templateProfiles = new Map<string, TemplatePerformanceProfile>();
  private lastCacheUpdate = 0;
  private cacheValidityDuration = 30 * 60 * 1000; // 30 minutes

  static getInstance(): PredictivePerformanceEngine {
    if (!PredictivePerformanceEngine.instance) {
      PredictivePerformanceEngine.instance = new PredictivePerformanceEngine();
    }
    return PredictivePerformanceEngine.instance;
  }

  async predictMessagePerformance(
    messageContent: string,
    leadId: string,
    urgencyLevel: 'low' | 'medium' | 'high'
  ): Promise<PerformancePrediction> {
    console.log('🔮 [PREDICTION ENGINE] Analyzing performance for lead:', leadId);

    try {
      // Ensure cache is fresh
      await this.refreshCacheIfNeeded();

      // Get lead engagement profile
      const leadProfile = await this.getLeadEngagementProfile(leadId);
      
      // Get template performance profile
      const templateProfile = await this.getTemplatePerformanceProfile(messageContent);
      
      // Calculate predictions
      const predictions = await this.calculatePredictions(
        leadProfile,
        templateProfile,
        urgencyLevel,
        messageContent
      );

      console.log('✅ [PREDICTION ENGINE] Prediction complete:', {
        responseRate: predictions.predictedResponseRate,
        conversionProb: predictions.predictedConversionProbability,
        confidence: predictions.confidenceScore
      });

      return predictions;

    } catch (error) {
      console.error('❌ [PREDICTION ENGINE] Prediction failed:', error);
      
      // Return conservative fallback predictions
      return this.getFallbackPrediction(leadId);
    }
  }

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheValidityDuration) {
      console.log('🔄 [PREDICTION ENGINE] Refreshing performance cache...');
      
      await Promise.all([
        this.refreshLeadProfiles(),
        this.refreshTemplateProfiles()
      ]);

      this.lastCacheUpdate = now;
      console.log('✅ [PREDICTION ENGINE] Cache refreshed');
    }
  }

  private async refreshLeadProfiles(): Promise<void> {
    // Get recent high-value leads for caching
    const { data: activeLeads } = await supabase
      .from('conversations')
      .select('lead_id')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(100);

    if (activeLeads) {
      const uniqueLeadIds = [...new Set(activeLeads.map(l => l.lead_id))];
      
      // Process in batches to avoid overwhelming the system
      const batches = this.createBatches(uniqueLeadIds, 10);
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (leadId) => {
            try {
              const profile = await this.buildLeadEngagementProfile(leadId);
              this.leadProfiles.set(leadId, profile);
            } catch (error) {
              console.error(`Failed to build profile for lead ${leadId}:`, error);
            }
          })
        );
      }
    }
  }

  private async refreshTemplateProfiles(): Promise<void> {
    const { data: templatePerformance } = await supabase
      .from('ai_template_performance')
      .select('*')
      .order('performance_score', { ascending: false })
      .limit(50);

    if (templatePerformance) {
      for (const template of templatePerformance) {
        const hash = this.generateTemplateHash(template.template_content);
        const profile: TemplatePerformanceProfile = {
          templateHash: hash,
          globalResponseRate: template.response_rate || 0,
          globalConversionRate: template.conversion_rate || 0,
          optimalTimingWindows: this.extractOptimalTimings(template),
          successfulLeadSegments: this.extractSuccessfulSegments(template),
          averageResponseTime: 12, // Default 12 hours
          seasonalVariations: (template.seasonal_performance as Record<string, number>) || {}
        };
        
        this.templateProfiles.set(hash, profile);
      }
    }
  }

  private async getLeadEngagementProfile(leadId: string): Promise<LeadEngagementProfile> {
    // Check cache first
    if (this.leadProfiles.has(leadId)) {
      return this.leadProfiles.get(leadId)!;
    }

    // Build and cache profile
    const profile = await this.buildLeadEngagementProfile(leadId);
    this.leadProfiles.set(leadId, profile);
    return profile;
  }

  private async buildLeadEngagementProfile(leadId: string): Promise<LeadEngagementProfile> {
    // Get conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select('direction, sent_at, body')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
      .limit(100);

    if (!conversations || conversations.length === 0) {
      return this.getDefaultLeadProfile(leadId);
    }

    // Calculate response metrics
    const responseTimes: number[] = [];
    let totalOutbound = 0;
    let totalInbound = 0;
    let positiveInteractions = 0;

    for (let i = 0; i < conversations.length - 1; i++) {
      const current = conversations[i];
      const next = conversations[i + 1];

      if (current.direction === 'out') {
        totalOutbound++;
      } else {
        totalInbound++;
        
        // Check for positive interaction indicators
        if (this.isPositiveInteraction(current.body)) {
          positiveInteractions++;
        }
      }

      // Calculate response time if customer responded to our message
      if (current.direction === 'out' && next.direction === 'in') {
        const responseTime = new Date(next.sent_at).getTime() - new Date(current.sent_at).getTime();
        responseTimes.push(responseTime / (1000 * 60 * 60)); // Convert to hours
      }
    }

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 24;

    const responseRate = totalOutbound > 0 ? (totalInbound / totalOutbound) * 100 : 0;

    // Determine preferred contact hours from successful interactions
    const preferredHours = this.extractPreferredContactHours(conversations);

    // Determine engagement pattern
    const engagementPattern = this.determineEngagementPattern(responseRate, averageResponseTime, positiveInteractions);

    // Extract conversion indicators
    const conversionIndicators = this.extractConversionIndicators(conversations);

    return {
      leadId,
      averageResponseTime,
      responseRate,
      preferredContactHours: preferredHours,
      engagementPattern,
      conversionIndicators,
      lastEngagementTime: new Date(conversations[conversations.length - 1].sent_at),
      totalInteractions: conversations.length,
      positiveInteractions
    };
  }

  private getTemplatePerformanceProfile(messageContent: string): TemplatePerformanceProfile {
    const hash = this.generateTemplateHash(messageContent);
    
    if (this.templateProfiles.has(hash)) {
      return this.templateProfiles.get(hash)!;
    }

    // Find similar templates
    const similarTemplate = this.findSimilarTemplate(messageContent);
    if (similarTemplate) {
      return similarTemplate;
    }

    // Return default profile
    return {
      templateHash: hash,
      globalResponseRate: 25, // Conservative default
      globalConversionRate: 5,
      optimalTimingWindows: [9, 14, 18], // 9 AM, 2 PM, 6 PM
      successfulLeadSegments: [],
      averageResponseTime: 12,
      seasonalVariations: {}
    };
  }

  private async calculatePredictions(
    leadProfile: LeadEngagementProfile,
    templateProfile: TemplatePerformanceProfile,
    urgencyLevel: string,
    messageContent: string
  ): Promise<PerformancePrediction> {
    
    // Base predictions from historical data
    let predictedResponseRate = (leadProfile.responseRate + templateProfile.globalResponseRate) / 2;
    let predictedResponseTime = (leadProfile.averageResponseTime + templateProfile.averageResponseTime) / 2;
    let predictedConversionProbability = templateProfile.globalConversionRate;

    // Adjust based on lead engagement pattern
    switch (leadProfile.engagementPattern) {
      case 'high':
        predictedResponseRate *= 1.3;
        predictedResponseTime *= 0.7;
        predictedConversionProbability *= 1.5;
        break;
      case 'medium':
        predictedResponseRate *= 1.0;
        predictedResponseTime *= 1.0;
        predictedConversionProbability *= 1.0;
        break;
      case 'low':
        predictedResponseRate *= 0.7;
        predictedResponseTime *= 1.4;
        predictedConversionProbability *= 0.6;
        break;
    }

    // Urgency adjustments
    const urgencyMultipliers = {
      high: { response: 1.2, time: 0.8, conversion: 1.1 },
      medium: { response: 1.0, time: 1.0, conversion: 1.0 },
      low: { response: 0.9, time: 1.2, conversion: 0.95 }
    };

    const multiplier = urgencyMultipliers[urgencyLevel];
    predictedResponseRate *= multiplier.response;
    predictedResponseTime *= multiplier.time;
    predictedConversionProbability *= multiplier.conversion;

    // Time-based adjustments
    const optimalSendTime = this.calculateOptimalSendTime(leadProfile, templateProfile);
    const currentHour = new Date().getHours();
    const isOptimalTime = templateProfile.optimalTimingWindows.includes(currentHour);
    
    if (isOptimalTime) {
      predictedResponseRate *= 1.15;
      predictedResponseTime *= 0.9;
    }

    // Freshness factor - recent interactions boost predictions
    const hoursSinceLastInteraction = (Date.now() - leadProfile.lastEngagementTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastInteraction < 24) {
      predictedResponseRate *= 1.2;
      predictedConversionProbability *= 1.15;
    } else if (hoursSinceLastInteraction > 168) { // More than a week
      predictedResponseRate *= 0.8;
      predictedConversionProbability *= 0.85;
    }

    // Conversion indicators boost
    const hasConversionIndicators = leadProfile.conversionIndicators.length > 0;
    if (hasConversionIndicators) {
      predictedConversionProbability *= 1.3;
    }

    // Calculate confidence score based on data quality
    const confidenceScore = this.calculateConfidenceScore(leadProfile, templateProfile);

    // Generate contributing factors and recommendations
    const contributingFactors = this.generateContributingFactors(leadProfile, templateProfile, urgencyLevel);
    const recommendations = this.generateRecommendations(leadProfile, templateProfile, {
      responseRate: predictedResponseRate,
      responseTime: predictedResponseTime,
      conversionProbability: predictedConversionProbability
    });

    // Ensure values are within reasonable bounds
    predictedResponseRate = Math.max(0, Math.min(100, predictedResponseRate));
    predictedResponseTime = Math.max(0.5, Math.min(168, predictedResponseTime));
    predictedConversionProbability = Math.max(0, Math.min(100, predictedConversionProbability));

    return {
      leadId: leadProfile.leadId,
      predictedResponseRate,
      predictedResponseTime,
      predictedConversionProbability,
      optimalSendTime,
      confidenceScore,
      contributingFactors,
      recommendations
    };
  }

  private calculateOptimalSendTime(
    leadProfile: LeadEngagementProfile,
    templateProfile: TemplatePerformanceProfile
  ): Date {
    const now = new Date();
    const currentHour = now.getHours();

    // Combine lead preferences with template optimal times
    const allOptimalHours = [
      ...leadProfile.preferredContactHours,
      ...templateProfile.optimalTimingWindows
    ];

    // Find the next optimal hour
    const uniqueHours = [...new Set(allOptimalHours)].sort((a, b) => a - b);
    
    let nextOptimalHour = uniqueHours.find(hour => hour > currentHour);
    if (!nextOptimalHour) {
      nextOptimalHour = uniqueHours[0]; // Tomorrow's first optimal hour
    }

    const optimalTime = new Date(now);
    if (nextOptimalHour <= currentHour) {
      optimalTime.setDate(optimalTime.getDate() + 1); // Next day
    }
    optimalTime.setHours(nextOptimalHour, 0, 0, 0);

    return optimalTime;
  }

  private calculateConfidenceScore(
    leadProfile: LeadEngagementProfile,
    templateProfile: TemplatePerformanceProfile
  ): number {
    let confidence = 50;

    // Lead data quality
    if (leadProfile.totalInteractions > 10) {
      confidence += 20;
    } else if (leadProfile.totalInteractions > 5) {
      confidence += 10;
    }

    // Template data quality
    if (templateProfile.globalResponseRate > 0) {
      confidence += 15;
    }

    // Recent activity
    const hoursSinceLastInteraction = (Date.now() - leadProfile.lastEngagementTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastInteraction < 48) {
      confidence += 10;
    }

    // Engagement pattern clarity
    if (leadProfile.engagementPattern === 'high' || leadProfile.engagementPattern === 'low') {
      confidence += 5; // Clear patterns are more predictable
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private generateContributingFactors(
    leadProfile: LeadEngagementProfile,
    templateProfile: TemplatePerformanceProfile,
    urgencyLevel: string
  ): string[] {
    const factors: string[] = [];

    if (leadProfile.responseRate > 70) {
      factors.push(`High lead response rate (${leadProfile.responseRate.toFixed(1)}%)`);
    } else if (leadProfile.responseRate < 30) {
      factors.push(`Low lead response rate (${leadProfile.responseRate.toFixed(1)}%)`);
    }

    if (templateProfile.globalResponseRate > 50) {
      factors.push(`Strong template performance (${templateProfile.globalResponseRate.toFixed(1)}%)`);
    }

    if (leadProfile.engagementPattern === 'high') {
      factors.push('Lead shows high engagement pattern');
    } else if (leadProfile.engagementPattern === 'low') {
      factors.push('Lead shows low engagement pattern');
    }

    if (leadProfile.conversionIndicators.length > 0) {
      factors.push(`Conversion indicators present: ${leadProfile.conversionIndicators.join(', ')}`);
    }

    if (urgencyLevel === 'high') {
      factors.push('High urgency messaging');
    }

    const hoursSinceLastInteraction = (Date.now() - leadProfile.lastEngagementTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastInteraction < 24) {
      factors.push('Recent lead activity');
    } else if (hoursSinceLastInteraction > 168) {
      factors.push('Extended period without interaction');
    }

    return factors;
  }

  private generateRecommendations(
    leadProfile: LeadEngagementProfile,
    templateProfile: TemplatePerformanceProfile,
    predictions: { responseRate: number; responseTime: number; conversionProbability: number }
  ): string[] {
    const recommendations: string[] = [];

    if (predictions.responseRate < 30) {
      recommendations.push('Consider personalizing message content');
      recommendations.push('Review message timing');
    }

    if (leadProfile.averageResponseTime > 24) {
      recommendations.push('Lead typically responds slowly - allow extra time');
    }

    if (leadProfile.preferredContactHours.length > 0) {
      const preferredHours = leadProfile.preferredContactHours.join(', ');
      recommendations.push(`Send during preferred hours: ${preferredHours}`);
    }

    if (predictions.conversionProbability > 15) {
      recommendations.push('High conversion potential - prioritize this message');
    }

    if (leadProfile.positiveInteractions > leadProfile.totalInteractions * 0.7) {
      recommendations.push('Lead shows strong positive engagement');
    }

    const currentHour = new Date().getHours();
    if (!templateProfile.optimalTimingWindows.includes(currentHour)) {
      recommendations.push(`Consider sending during optimal hours: ${templateProfile.optimalTimingWindows.join(', ')}`);
    }

    return recommendations;
  }

  // Helper methods
  private generateTemplateHash(content: string): string {
    return btoa(content.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private findSimilarTemplate(messageContent: string): TemplatePerformanceProfile | null {
    const messageWords = messageContent.toLowerCase().split(' ');
    
    for (const [hash, profile] of this.templateProfiles) {
      // Simple similarity check - could be enhanced with more sophisticated matching
      const similarity = this.calculateSimilarity(messageContent, hash);
      if (similarity > 0.7) {
        return profile;
      }
    }
    
    return null;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity - could be enhanced
    const words1 = new Set(text1.toLowerCase().split(' '));
    const words2 = new Set(text2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private extractOptimalTimings(template: any): number[] {
    // Extract optimal timing from template data or use defaults
    return template.optimal_hours || [9, 14, 18];
  }

  private extractSuccessfulSegments(template: any): string[] {
    return template.successful_segments || [];
  }

  private extractPreferredContactHours(conversations: any[]): number[] {
    const successfulHours: number[] = [];
    
    conversations.forEach(conv => {
      if (conv.direction === 'in') {
        const hour = new Date(conv.sent_at).getHours();
        successfulHours.push(hour);
      }
    });

    // Return most common hours
    const hourCounts = successfulHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private determineEngagementPattern(
    responseRate: number,
    averageResponseTime: number,
    positiveInteractions: number
  ): 'high' | 'medium' | 'low' {
    if (responseRate > 60 && averageResponseTime < 12 && positiveInteractions > 3) {
      return 'high';
    } else if (responseRate > 30 && averageResponseTime < 24) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private extractConversionIndicators(conversations: any[]): string[] {
    const indicators: string[] = [];
    const conversionKeywords = [
      'interested', 'pricing', 'finance', 'appointment', 'test drive',
      'availability', 'schedule', 'visit', 'dealership', 'buy'
    ];

    conversations.forEach(conv => {
      if (conv.direction === 'in') {
        const body = conv.body.toLowerCase();
        conversionKeywords.forEach(keyword => {
          if (body.includes(keyword) && !indicators.includes(keyword)) {
            indicators.push(keyword);
          }
        });
      }
    });

    return indicators;
  }

  private isPositiveInteraction(messageBody: string): boolean {
    const positiveKeywords = [
      'yes', 'interested', 'thank', 'appreciate', 'good', 'great',
      'sounds good', 'perfect', 'awesome', 'helpful'
    ];
    
    const body = messageBody.toLowerCase();
    return positiveKeywords.some(keyword => body.includes(keyword));
  }

  private getDefaultLeadProfile(leadId: string): LeadEngagementProfile {
    return {
      leadId,
      averageResponseTime: 24,
      responseRate: 25,
      preferredContactHours: [9, 14, 18],
      engagementPattern: 'medium',
      conversionIndicators: [],
      lastEngagementTime: new Date(),
      totalInteractions: 0,
      positiveInteractions: 0
    };
  }

  private getFallbackPrediction(leadId: string): PerformancePrediction {
    return {
      leadId,
      predictedResponseRate: 25,
      predictedResponseTime: 12,
      predictedConversionProbability: 5,
      optimalSendTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      confidenceScore: 30,
      contributingFactors: ['Limited historical data available'],
      recommendations: ['Monitor performance and collect more data']
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Cache management
  clearCache(): void {
    this.leadProfiles.clear();
    this.templateProfiles.clear();
    this.lastCacheUpdate = 0;
  }

  getCacheStats(): { leads: number; templates: number; lastUpdate: Date } {
    return {
      leads: this.leadProfiles.size,
      templates: this.templateProfiles.size,
      lastUpdate: new Date(this.lastCacheUpdate)
    };
  }
}

export const predictivePerformanceEngine = PredictivePerformanceEngine.getInstance();