
import { supabase } from '@/integrations/supabase/client';
import { aiLearningService } from '@/services/aiLearningService';

export interface PredictiveInsight {
  type: 'conversion_probability' | 'optimal_timing' | 'content_recommendation' | 'churn_risk';
  confidence: number;
  prediction: any;
  reasoning: string[];
  recommendedActions: string[];
  expectedOutcome: string;
}

export interface LeadPrediction {
  leadId: string;
  conversionProbability: number;
  predictedCloseDate: Date | null;
  predictedValue: number;
  churnRisk: number;
  optimalContactTimes: number[];
  recommendedMessages: string[];
  predictionFactors: Record<string, number>;
}

class PredictiveAnalyticsService {
  // Predict lead conversion probability using historical patterns
  async predictLeadConversion(leadId: string): Promise<LeadPrediction> {
    try {
      // Get lead data and interaction history
      const { data: leadData } = await supabase
        .from('leads')
        .select(`
          *,
          conversations(count),
          appointments(count),
          lead_inventory_interests(count)
        `)
        .eq('id', leadId)
        .single();

      if (!leadData) {
        throw new Error('Lead not found');
      }

      // Get similar leads for pattern matching
      const { data: similarLeads } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .eq('outcome_type', 'conversion')
        .limit(100);

      // Calculate conversion probability based on multiple factors
      const factors = await this.calculateConversionFactors(leadData);
      const conversionProbability = this.calculateWeightedProbability(factors);

      // Predict optimal contact times
      const optimalTimes = await this.predictOptimalContactTimes(leadId);

      // Predict message recommendations
      const recommendedMessages = await this.generateMessageRecommendations(leadData, factors);

      // Calculate predicted close date and value
      const predictedCloseDate = this.predictCloseDate(conversionProbability, factors);
      const predictedValue = this.predictDealValue(leadData, factors);

      // Calculate churn risk
      const churnRisk = await this.calculateChurnRisk(leadId);

      return {
        leadId,
        conversionProbability,
        predictedCloseDate,
        predictedValue,
        churnRisk,
        optimalContactTimes: optimalTimes,
        recommendedMessages,
        predictionFactors: factors
      };
    } catch (error) {
      console.error('Error predicting lead conversion:', error);
      throw error;
    }
  }

  // Calculate various factors that influence conversion
  private async calculateConversionFactors(leadData: any): Promise<Record<string, number>> {
    const factors: Record<string, number> = {};

    // Response rate factor
    const { data: conversations } = await supabase
      .from('conversations')
      .select('direction')
      .eq('lead_id', leadData.id);

    if (conversations && conversations.length > 0) {
      const outbound = conversations.filter(c => c.direction === 'out').length;
      const inbound = conversations.filter(c => c.direction === 'in').length;
      factors.responseRate = outbound > 0 ? inbound / outbound : 0;
    } else {
      factors.responseRate = 0;
    }

    // Engagement factor
    factors.messageCount = conversations?.length || 0;
    factors.engagementScore = Math.min(factors.messageCount / 10, 1); // Normalize to 0-1

    // Time since last interaction
    const daysSinceLastReply = leadData.last_reply_at 
      ? (Date.now() - new Date(leadData.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    factors.recencyScore = Math.max(0, 1 - (daysSinceLastReply / 30)); // Decay over 30 days

    // Vehicle interest specificity
    const vehicleInterest = leadData.vehicle_interest || '';
    factors.specificityScore = this.calculateInterestSpecificity(vehicleInterest);

    // Source quality (some sources convert better)
    factors.sourceQuality = this.getSourceQuality(leadData.source);

    // Appointment factor
    const { data: appointments } = await supabase
      .from('appointments')
      .select('status')
      .eq('lead_id', leadData.id);
    
    factors.appointmentFactor = appointments?.length > 0 ? 0.8 : 0;

    return factors;
  }

  // Calculate weighted probability from factors
  private calculateWeightedProbability(factors: Record<string, number>): number {
    const weights = {
      responseRate: 0.25,
      engagementScore: 0.20,
      recencyScore: 0.15,
      specificityScore: 0.15,
      sourceQuality: 0.10,
      appointmentFactor: 0.15
    };

    let probability = 0;
    for (const [factor, value] of Object.entries(factors)) {
      const weight = weights[factor as keyof typeof weights] || 0;
      probability += value * weight;
    }

    return Math.min(Math.max(probability, 0), 1); // Clamp between 0 and 1
  }

  // Predict optimal contact times based on response patterns
  private async predictOptimalContactTimes(leadId: string): Promise<number[]> {
    const { data: analytics } = await supabase
      .from('ai_message_analytics')
      .select('hour_of_day, response_time_hours')
      .eq('lead_id', leadId)
      .not('response_time_hours', 'is', null);

    if (!analytics || analytics.length === 0) {
      // Default optimal times if no data
      return [9, 14, 17]; // 9 AM, 2 PM, 5 PM
    }

    // Find hours with fastest response times
    const hourMap = new Map<number, number[]>();
    analytics.forEach(a => {
      if (!hourMap.has(a.hour_of_day)) {
        hourMap.set(a.hour_of_day, []);
      }
      hourMap.get(a.hour_of_day)!.push(a.response_time_hours);
    });

    // Calculate average response time per hour
    const hourAverages = Array.from(hourMap.entries()).map(([hour, times]) => ({
      hour,
      avgResponse: times.reduce((sum, time) => sum + time, 0) / times.length
    }));

    // Sort by fastest response and return top 3 hours
    return hourAverages
      .sort((a, b) => a.avgResponse - b.avgResponse)
      .slice(0, 3)
      .map(h => h.hour);
  }

  // Generate message recommendations based on successful patterns
  private async generateMessageRecommendations(leadData: any, factors: Record<string, number>): Promise<string[]> {
    // Get high-performing message templates for similar leads
    const { data: templates } = await supabase
      .from('ai_template_performance')
      .select('*')
      .gte('performance_score', 0.7)
      .order('performance_score', { ascending: false })
      .limit(5);

    if (!templates) return [];

    // Filter templates based on lead characteristics
    return templates
      .filter(t => this.isTemplateRelevant(t, leadData, factors))
      .map(t => t.template_content)
      .slice(0, 3);
  }

  // Check if template is relevant for the lead
  private isTemplateRelevant(template: any, leadData: any, factors: Record<string, number>): boolean {
    // Simple relevance check - can be enhanced with ML
    const vehicleInterest = leadData.vehicle_interest?.toLowerCase() || '';
    const templateContent = template.template_content?.toLowerCase() || '';
    
    // Check for vehicle mention alignment
    if (vehicleInterest.includes('truck') && templateContent.includes('truck')) return true;
    if (vehicleInterest.includes('suv') && templateContent.includes('suv')) return true;
    if (vehicleInterest.includes('sedan') && templateContent.includes('sedan')) return true;
    
    // Default relevance for general templates
    return template.performance_score > 0.8;
  }

  // Predict close date based on conversion probability and factors
  private predictCloseDate(probability: number, factors: Record<string, number>): Date | null {
    if (probability < 0.3) return null; // Low probability leads unlikely to close

    // Base days to close based on probability
    const baseDays = Math.round(60 * (1 - probability)); // Higher probability = faster close
    
    // Adjust based on engagement
    const engagementAdjustment = (factors.engagementScore - 0.5) * 14; // +/- 2 weeks
    
    const totalDays = Math.max(7, baseDays + engagementAdjustment); // Minimum 1 week
    
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + totalDays);
    
    return closeDate;
  }

  // Predict deal value based on vehicle interest and historical data
  private predictDealValue(leadData: any, factors: Record<string, number>): number {
    // Base value estimates by vehicle type
    const vehicleInterest = leadData.vehicle_interest?.toLowerCase() || '';
    let baseValue = 25000; // Default

    if (vehicleInterest.includes('truck')) baseValue = 45000;
    else if (vehicleInterest.includes('suv')) baseValue = 35000;
    else if (vehicleInterest.includes('luxury')) baseValue = 55000;
    else if (vehicleInterest.includes('sedan')) baseValue = 28000;

    // Adjust based on engagement and source quality
    const multiplier = 0.8 + (factors.engagementScore * 0.3) + (factors.sourceQuality * 0.2);
    
    return Math.round(baseValue * multiplier);
  }

  // Calculate churn risk based on interaction patterns
  private async calculateChurnRisk(leadId: string): Promise<number> {
    const { data: leadData } = await supabase
      .from('leads')
      .select('last_reply_at, created_at')
      .eq('id', leadId)
      .single();

    if (!leadData) return 0.5; // Default medium risk

    const daysSinceCreated = (Date.now() - new Date(leadData.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceLastReply = leadData.last_reply_at 
      ? (Date.now() - new Date(leadData.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)
      : daysSinceCreated;

    // Higher risk if no recent interaction and lead is getting old
    let churnRisk = 0;
    
    if (daysSinceLastReply > 14) churnRisk += 0.4;
    if (daysSinceLastReply > 30) churnRisk += 0.3;
    if (daysSinceCreated > 90) churnRisk += 0.2;
    if (daysSinceCreated > 180) churnRisk += 0.1;

    return Math.min(churnRisk, 1);
  }

  // Calculate interest specificity score
  private calculateInterestSpecificity(interest: string): number {
    if (!interest) return 0.1;
    
    const specificTerms = ['vin', 'stock', 'year', 'model', 'trim', 'color', 'mileage'];
    const mentionedTerms = specificTerms.filter(term => 
      interest.toLowerCase().includes(term)
    );
    
    return Math.min(mentionedTerms.length / 3, 1); // Normalize to max 1
  }

  // Get source quality score
  private getSourceQuality(source: string): number {
    const sourceScores: Record<string, number> = {
      'website': 0.8,
      'referral': 0.9,
      'facebook': 0.6,
      'google': 0.7,
      'autotrader': 0.75,
      'cars.com': 0.75,
      'walk-in': 0.85,
      'phone': 0.8,
      'unknown': 0.5
    };

    return sourceScores[source?.toLowerCase()] || 0.5;
  }

  // Generate predictive insights for all active leads
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      // Get active leads
      const { data: activeLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .limit(50);

      if (!activeLeads) return insights;

      for (const lead of activeLeads) {
        const prediction = await this.predictLeadConversion(lead.id);
        
        // Generate conversion probability insight
        if (prediction.conversionProbability > 0.7) {
          insights.push({
            type: 'conversion_probability',
            confidence: prediction.conversionProbability,
            prediction: {
              leadId: lead.id,
              leadName: `${lead.first_name} ${lead.last_name}`,
              probability: prediction.conversionProbability,
              predictedValue: prediction.predictedValue
            },
            reasoning: [
              'High engagement score',
              'Strong response pattern',
              'Recent interaction activity'
            ],
            recommendedActions: [
              'Schedule follow-up call',
              'Send personalized offer',
              'Prioritize in sales queue'
            ],
            expectedOutcome: `High probability conversion worth $${prediction.predictedValue.toLocaleString()}`
          });
        }

        // Generate churn risk insight
        if (prediction.churnRisk > 0.6) {
          insights.push({
            type: 'churn_risk',
            confidence: prediction.churnRisk,
            prediction: {
              leadId: lead.id,
              leadName: `${lead.first_name} ${lead.last_name}`,
              churnRisk: prediction.churnRisk
            },
            reasoning: [
              'Extended period without response',
              'Declining engagement pattern',
              'Lead aging without progress'
            ],
            recommendedActions: [
              'Send re-engagement campaign',
              'Offer special incentive',
              'Human intervention recommended'
            ],
            expectedOutcome: 'Prevent lead churn and re-engage customer'
          });
        }
      }

      return insights;
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return insights;
    }
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
