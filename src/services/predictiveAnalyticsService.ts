import { supabase } from '@/integrations/supabase/client';

export interface PredictiveInsight {
  id: string;
  type: 'conversion_prediction' | 'churn_risk' | 'optimal_timing' | 'content_recommendation';
  leadId?: string;
  confidence: number;
  prediction: any;
  reasoning: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface LeadPrediction {
  leadId: string;
  conversionProbability: number;
  churnRisk: number;
  predictedValue: number;
  optimalContactTime: Date;
  recommendedActions: string[];
  confidenceScore: number;
}

class PredictiveAnalyticsService {
  // Predict lead conversion probability using behavioral patterns
  async predictLeadConversion(leadId: string): Promise<LeadPrediction | null> {
    try {
      // Get lead data and interaction history
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) return null;

      // Get conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      // Get communication patterns
      const { data: patterns } = await supabase
        .from('lead_communication_patterns')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      // Get similar successful leads for comparison
      const { data: successfulLeads } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .in('outcome_type', ['sale', 'appointment_booked'])
        .limit(50);

      // Calculate prediction factors
      const factors = this.calculatePredictionFactors(lead, conversations || [], patterns, successfulLeads || []);
      
      // Generate prediction
      const conversionProbability = this.calculateConversionProbability(factors);
      const churnRisk = this.calculateChurnRisk(factors);
      const predictedValue = this.estimatePotentialValue(factors);
      const optimalContactTime = this.predictOptimalContactTime(factors);
      const recommendedActions = this.generateRecommendedActions(factors);

      return {
        leadId,
        conversionProbability,
        churnRisk,
        predictedValue,
        optimalContactTime,
        recommendedActions,
        confidenceScore: factors.dataQuality
      };

    } catch (error) {
      console.error('Error predicting lead conversion:', error);
      return null;
    }
  }

  // Calculate various prediction factors
  private calculatePredictionFactors(
    lead: any,
    conversations: any[],
    patterns: any,
    successfulLeads: any[]
  ) {
    // Engagement factors
    const totalMessages = conversations.length;
    const customerMessages = conversations.filter(c => c.direction === 'in').length;
    const responseRate = totalMessages > 0 ? customerMessages / totalMessages : 0;
    const avgResponseTime = this.calculateAverageResponseTime(conversations);
    
    // Timing factors
    const daysSinceFirstContact = lead.created_at 
      ? (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const daysSinceLastReply = lead.last_reply_at
      ? (Date.now() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Interest factors
    const hasSpecificVehicleInterest = lead.vehicle_interest && 
      !lead.vehicle_interest.includes('finding the right vehicle');
    const hasPriceRange = lead.preferred_price_min || lead.preferred_price_max;
    
    // Behavioral factors
    const messageSentiment = this.analyzeSentiment(conversations);
    const engagementTrend = this.calculateEngagementTrend(conversations);
    
    // Pattern matching with successful leads
    const similarityScore = this.calculateSimilarityToSuccessfulLeads(
      { responseRate, avgResponseTime, daysSinceFirstContact, hasSpecificVehicleInterest },
      successfulLeads
    );

    // Data quality assessment
    const dataQuality = this.assessDataQuality(conversations, patterns);

    return {
      totalMessages,
      responseRate,
      avgResponseTime,
      daysSinceFirstContact,
      daysSinceLastReply,
      hasSpecificVehicleInterest,
      hasPriceRange,
      messageSentiment,
      engagementTrend,
      similarityScore,
      dataQuality
    };
  }

  // Calculate conversion probability (0-1)
  private calculateConversionProbability(factors: any): number {
    let probability = 0.3; // Base probability

    // Response engagement boost
    if (factors.responseRate > 0.6) probability += 0.25;
    else if (factors.responseRate > 0.3) probability += 0.15;
    else if (factors.responseRate < 0.1) probability -= 0.2;

    // Response timing boost
    if (factors.avgResponseTime < 2) probability += 0.2;
    else if (factors.avgResponseTime < 6) probability += 0.1;
    else if (factors.avgResponseTime > 24) probability -= 0.15;

    // Interest specificity boost
    if (factors.hasSpecificVehicleInterest) probability += 0.15;
    if (factors.hasPriceRange) probability += 0.1;

    // Sentiment boost
    if (factors.messageSentiment > 0.6) probability += 0.2;
    else if (factors.messageSentiment < 0.3) probability -= 0.15;

    // Engagement trend
    if (factors.engagementTrend > 0) probability += 0.1;
    else if (factors.engagementTrend < -0.2) probability -= 0.2;

    // Recent activity penalty
    if (factors.daysSinceLastReply > 14) probability -= 0.3;
    else if (factors.daysSinceLastReply > 7) probability -= 0.1;

    // Similarity to successful leads
    probability += factors.similarityScore * 0.2;

    // Keep within bounds
    return Math.max(0, Math.min(1, probability));
  }

  // Calculate churn risk (0-1)
  private calculateChurnRisk(factors: any): number {
    let risk = 0.2; // Base risk

    // Time-based risk
    if (factors.daysSinceLastReply > 21) risk += 0.4;
    else if (factors.daysSinceLastReply > 14) risk += 0.3;
    else if (factors.daysSinceLastReply > 7) risk += 0.1;

    // Engagement risk
    if (factors.responseRate < 0.1) risk += 0.3;
    else if (factors.responseRate < 0.3) risk += 0.2;

    // Sentiment risk
    if (factors.messageSentiment < 0.3) risk += 0.2;

    // Trend risk
    if (factors.engagementTrend < -0.3) risk += 0.3;

    return Math.max(0, Math.min(1, risk));
  }

  // Estimate potential deal value
  private estimatePotentialValue(factors: any): number {
    let baseValue = 25000; // Average vehicle price

    // Interest specificity multiplier
    if (factors.hasSpecificVehicleInterest) baseValue *= 1.2;
    if (factors.hasPriceRange) baseValue *= 1.1;

    // Engagement multiplier
    if (factors.responseRate > 0.5) baseValue *= 1.3;
    else if (factors.responseRate < 0.2) baseValue *= 0.8;

    // Sentiment multiplier
    if (factors.messageSentiment > 0.6) baseValue *= 1.2;
    else if (factors.messageSentiment < 0.4) baseValue *= 0.9;

    return Math.round(baseValue);
  }

  // Predict optimal contact time
  private predictOptimalContactTime(factors: any): Date {
    const now = new Date();
    let optimalTime = new Date(now);

    // If recent engagement, contact soon
    if (factors.daysSinceLastReply < 1) {
      optimalTime.setHours(optimalTime.getHours() + 4);
    } else if (factors.daysSinceLastReply < 3) {
      optimalTime.setHours(optimalTime.getHours() + 12);
    } else if (factors.daysSinceLastReply < 7) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    } else {
      // For cold leads, wait for next business day
      optimalTime.setDate(optimalTime.getDate() + 2);
    }

    // Adjust to business hours (9 AM - 6 PM)
    if (optimalTime.getHours() < 9) {
      optimalTime.setHours(9, 0, 0, 0);
    } else if (optimalTime.getHours() >= 18) {
      optimalTime.setDate(optimalTime.getDate() + 1);
      optimalTime.setHours(9, 0, 0, 0);
    }

    return optimalTime;
  }

  // Generate recommended actions
  private generateRecommendedActions(factors: any): string[] {
    const actions: string[] = [];

    if (factors.churnRisk > 0.7) {
      actions.push('High churn risk - escalate to human agent immediately');
    } else if (factors.churnRisk > 0.5) {
      actions.push('Medium churn risk - send personalized re-engagement message');
    }

    if (factors.conversionProbability > 0.7) {
      actions.push('High conversion probability - offer test drive or appointment');
    } else if (factors.conversionProbability > 0.5) {
      actions.push('Good conversion potential - provide detailed vehicle information');
    }

    if (factors.responseRate > 0.6) {
      actions.push('Highly engaged - maintain regular communication');
    } else if (factors.responseRate < 0.2) {
      actions.push('Low engagement - try different communication approach');
    }

    if (factors.daysSinceLastReply > 7) {
      actions.push('Re-engagement needed - send compelling offer or new inventory alert');
    }

    if (factors.messageSentiment < 0.4) {
      actions.push('Address concerns - focus on objection handling');
    }

    return actions.slice(0, 3); // Return top 3 actions
  }

  // Helper methods
  private calculateAverageResponseTime(conversations: any[]): number {
    const responses = conversations
      .filter(c => c.direction === 'in')
      .map((response, index) => {
        const prevMessage = conversations
          .slice(0, index)
          .reverse()
          .find(c => c.direction === 'out');
        
        if (prevMessage) {
          const timeDiff = new Date(response.sent_at).getTime() - new Date(prevMessage.sent_at).getTime();
          return timeDiff / (1000 * 60 * 60); // Convert to hours
        }
        return null;
      })
      .filter(time => time !== null);

    return responses.length > 0 
      ? responses.reduce((sum, time) => sum + time, 0) / responses.length 
      : 24;
  }

  private analyzeSentiment(conversations: any[]): number {
    const customerMessages = conversations.filter(c => c.direction === 'in');
    if (customerMessages.length === 0) return 0.5;

    // Simple sentiment analysis based on keywords
    let totalSentiment = 0;
    
    customerMessages.forEach(msg => {
      const text = msg.body.toLowerCase();
      let sentiment = 0.5; // Neutral

      // Positive indicators
      if (text.includes('interested') || text.includes('yes') || text.includes('great') || 
          text.includes('good') || text.includes('perfect') || text.includes('love')) {
        sentiment += 0.3;
      }

      // Negative indicators
      if (text.includes('not interested') || text.includes('no') || text.includes('stop') || 
          text.includes('expensive') || text.includes('busy') || text.includes('maybe later')) {
        sentiment -= 0.3;
      }

      totalSentiment += Math.max(0, Math.min(1, sentiment));
    });

    return totalSentiment / customerMessages.length;
  }

  private calculateEngagementTrend(conversations: any[]): number {
    if (conversations.length < 4) return 0;

    const recent = conversations.slice(-4);
    const earlier = conversations.slice(-8, -4);

    const recentEngagement = recent.filter(c => c.direction === 'in').length / recent.length;
    const earlierEngagement = earlier.length > 0 
      ? earlier.filter(c => c.direction === 'in').length / earlier.length 
      : 0;

    return recentEngagement - earlierEngagement;
  }

  private calculateSimilarityToSuccessfulLeads(factors: any, successfulLeads: any[]): number {
    if (successfulLeads.length === 0) return 0;

    // Calculate average characteristics of successful leads
    let avgResponseRate = 0, avgResponseTime = 0, avgDaysToSuccess = 0;
    let specificInterestCount = 0;

    successfulLeads.forEach(lead => {
      // This would need to be enhanced with actual lead characteristic data
      avgResponseRate += 0.4; // Placeholder
      avgResponseTime += 8; // Placeholder
      avgDaysToSuccess += lead.days_to_outcome || 14;
      if (Math.random() > 0.5) specificInterestCount++; // Placeholder
    });

    avgResponseRate /= successfulLeads.length;
    avgResponseTime /= successfulLeads.length;
    avgDaysToSuccess /= successfulLeads.length;
    const specificInterestRate = specificInterestCount / successfulLeads.length;

    // Calculate similarity score
    let similarity = 0;
    
    // Response rate similarity
    similarity += 1 - Math.abs(factors.responseRate - avgResponseRate);
    
    // Response time similarity (inverse - lower is better)
    const responseTimeDiff = Math.abs(factors.avgResponseTime - avgResponseTime) / 24;
    similarity += Math.max(0, 1 - responseTimeDiff);
    
    // Interest specificity similarity
    const hasSpecific = factors.hasSpecificVehicleInterest ? 1 : 0;
    similarity += 1 - Math.abs(hasSpecific - specificInterestRate);

    return similarity / 3; // Average of all factors
  }

  private assessDataQuality(conversations: any[], patterns: any): number {
    let quality = 0.5; // Base quality

    // Conversation volume
    if (conversations.length > 10) quality += 0.2;
    else if (conversations.length > 5) quality += 0.1;
    else if (conversations.length < 3) quality -= 0.2;

    // Two-way conversation
    const customerMessages = conversations.filter(c => c.direction === 'in').length;
    const totalMessages = conversations.length;
    if (customerMessages > 0 && totalMessages > 0) {
      const ratio = customerMessages / totalMessages;
      if (ratio > 0.2 && ratio < 0.8) quality += 0.2;
    }

    // Pattern data availability
    if (patterns) quality += 0.1;

    // Recent data
    const recentMessages = conversations.filter(c => {
      const msgDate = new Date(c.sent_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return msgDate > weekAgo;
    });
    
    if (recentMessages.length > 0) quality += 0.2;

    return Math.max(0, Math.min(1, quality));
  }

  // Generate predictive insights for multiple leads
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      // Get active leads for analysis
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('ai_opt_in', true)
        .limit(20);

      if (!leads) return insights;

      for (const lead of leads) {
        const prediction = await this.predictLeadConversion(lead.id);
        
        if (prediction) {
          // High conversion probability insight
          if (prediction.conversionProbability > 0.7) {
            insights.push({
              id: `conversion_${lead.id}_${Date.now()}`,
              type: 'conversion_prediction',
              leadId: lead.id,
              confidence: prediction.confidenceScore,
              prediction: { probability: prediction.conversionProbability },
              reasoning: `High conversion probability (${Math.round(prediction.conversionProbability * 100)}%) based on engagement patterns`,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
          }

          // High churn risk insight
          if (prediction.churnRisk > 0.6) {
            insights.push({
              id: `churn_${lead.id}_${Date.now()}`,
              type: 'churn_risk',
              leadId: lead.id,
              confidence: prediction.confidenceScore,
              prediction: { risk: prediction.churnRisk },
              reasoning: `High churn risk (${Math.round(prediction.churnRisk * 100)}%) - immediate action needed`,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
            });
          }
        }
      }

    } catch (error) {
      console.error('Error generating predictive insights:', error);
    }

    return insights;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
