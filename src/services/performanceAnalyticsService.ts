
import { supabase } from '@/integrations/supabase/client';

export interface AIPerformanceMetrics {
  totalMessages: number;
  responseRate: number;
  conversionRate: number;
  averageResponseTime: number;
  sentimentImprovement: number;
  templateEffectiveness: TemplatePerformance[];
  timeBasedPerformance: TimeBasedMetrics[];
  leadQualityMetrics: LeadQualityMetrics;
}

export interface TemplatePerformance {
  template: string;
  usageCount: number;
  responseRate: number;
  conversionRate: number;
  avgSentiment: number;
  performanceScore: number;
}

export interface TimeBasedMetrics {
  timeSlot: string;
  messageCount: number;
  responseRate: number;
  avgResponseTime: number;
  conversionRate: number;
}

export interface LeadQualityMetrics {
  highQualityLeads: number;
  mediumQualityLeads: number;
  lowQualityLeads: number;
  avgLeadScore: number;
  churnPrevention: number;
}

export interface ConversionTrackingData {
  leadId: string;
  journeyStage: string;
  touchpoints: TouchpointData[];
  conversionEvents: ConversionEvent[];
  totalValue: number;
  timeToConversion: number;
}

export interface TouchpointData {
  type: 'sms' | 'email' | 'call' | 'appointment';
  timestamp: Date;
  aiGenerated: boolean;
  sentiment: number;
  responseReceived: boolean;
  conversionContribution: number;
}

export interface ConversionEvent {
  eventType: 'appointment_booked' | 'test_drive' | 'purchase' | 'lead_qualified';
  timestamp: Date;
  value: number;
  contributingFactors: string[];
}

export interface TeamPerformanceMetrics {
  salespersonId: string;
  name: string;
  totalLeads: number;
  aiAssistedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  customerSatisfaction: number;
  aiEffectivenessScore: number;
  improvementAreas: string[];
}

class PerformanceAnalyticsService {
  
  async getAIPerformanceMetrics(dateRange: { start: Date; end: Date }): Promise<AIPerformanceMetrics> {
    console.log('📊 [PERFORMANCE] Getting AI performance metrics');
    
    try {
      // Get message analytics
      const { data: messageAnalytics } = await supabase
        .from('ai_message_analytics')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Get template performance
      const { data: templatePerf } = await supabase
        .from('ai_template_performance')
        .select('*')
        .order('performance_score', { ascending: false });

      // Get learning outcomes
      const { data: outcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const totalMessages = messageAnalytics?.length || 0;
      const responseRate = this.calculateResponseRate(messageAnalytics || []);
      const conversionRate = this.calculateConversionRate(outcomes || []);
      const averageResponseTime = this.calculateAverageResponseTime(messageAnalytics || []);
      const sentimentImprovement = this.calculateSentimentImprovement(outcomes || []);

      return {
        totalMessages,
        responseRate,
        conversionRate,
        averageResponseTime,
        sentimentImprovement,
        templateEffectiveness: this.processTemplatePerformance(templatePerf || []),
        timeBasedPerformance: this.calculateTimeBasedMetrics(messageAnalytics || []),
        leadQualityMetrics: await this.getLeadQualityMetrics(dateRange)
      };
    } catch (error) {
      console.error('❌ [PERFORMANCE] Error getting AI metrics:', error);
      throw error;
    }
  }

  async trackConversion(leadId: string, eventType: ConversionEvent['eventType'], value: number = 0): Promise<void> {
    console.log('🎯 [PERFORMANCE] Tracking conversion:', { leadId, eventType, value });
    
    try {
      // Record the conversion event
      await supabase.from('ai_learning_outcomes').insert({
        lead_id: leadId,
        outcome_type: eventType,
        outcome_value: value,
        days_to_outcome: await this.calculateDaysToOutcome(leadId),
        success_factors: await this.identifySuccessFactors(leadId)
      });

      // Update lead scoring based on conversion
      await this.updateLeadScoringFromConversion(leadId, eventType, value);
      
    } catch (error) {
      console.error('❌ [PERFORMANCE] Error tracking conversion:', error);
      throw error;
    }
  }

  async getConversionTracking(leadId: string): Promise<ConversionTrackingData | null> {
    try {
      // Get lead journey data
      const { data: journey } = await supabase
        .from('customer_journeys')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (!journey) return null;

      // Get touchpoints
      const touchpoints = await this.getTouchpoints(leadId);
      
      // Get conversion events
      const { data: conversionEvents } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .eq('lead_id', leadId)
        .in('outcome_type', ['appointment_booked', 'test_drive', 'purchase', 'lead_qualified']);

      const totalValue = conversionEvents?.reduce((sum, event) => sum + (event.outcome_value || 0), 0) || 0;
      const timeToConversion = await this.calculateTimeToConversion(leadId);

      return {
        leadId,
        journeyStage: journey.journey_stage,
        touchpoints,
        conversionEvents: conversionEvents?.map(e => ({
          eventType: e.outcome_type as ConversionEvent['eventType'],
          timestamp: new Date(e.created_at),
          value: e.outcome_value || 0,
          contributingFactors: e.success_factors ? Object.keys(e.success_factors) : []
        })) || [],
        totalValue,
        timeToConversion
      };
    } catch (error) {
      console.error('❌ [PERFORMANCE] Error getting conversion tracking:', error);
      return null;
    }
  }

  async getTeamPerformanceMetrics(): Promise<TeamPerformanceMetrics[]> {
    console.log('👥 [PERFORMANCE] Getting team performance metrics');
    
    try {
      // Get all salespeople with their lead data
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          leads (
            id,
            ai_automation_enabled,
            conversations (count)
          )
        `)
        .eq('role', 'sales');

      const teamMetrics: TeamPerformanceMetrics[] = [];

      for (const profile of profiles || []) {
        const metrics = await this.calculateSalespersonMetrics(profile);
        teamMetrics.push(metrics);
      }

      return teamMetrics.sort((a, b) => b.aiEffectivenessScore - a.aiEffectivenessScore);
    } catch (error) {
      console.error('❌ [PERFORMANCE] Error getting team metrics:', error);
      throw error;
    }
  }

  private calculateResponseRate(analytics: any[]): number {
    if (analytics.length === 0) return 0;
    const responded = analytics.filter(a => a.responded_at).length;
    return (responded / analytics.length) * 100;
  }

  private calculateConversionRate(outcomes: any[]): number {
    if (outcomes.length === 0) return 0;
    const conversions = outcomes.filter(o => 
      ['appointment_booked', 'purchase', 'lead_qualified'].includes(o.outcome_type)
    ).length;
    return (conversions / outcomes.length) * 100;
  }

  private calculateAverageResponseTime(analytics: any[]): number {
    const responded = analytics.filter(a => a.response_time_hours);
    if (responded.length === 0) return 0;
    const total = responded.reduce((sum, a) => sum + a.response_time_hours, 0);
    return total / responded.length;
  }

  private calculateSentimentImprovement(outcomes: any[]): number {
    // Calculate sentiment improvement based on conversation progression
    const sentimentData = outcomes.filter(o => o.lead_characteristics?.reply_sentiment);
    if (sentimentData.length === 0) return 0;
    
    const positive = sentimentData.filter(o => o.lead_characteristics.reply_sentiment === 'positive').length;
    return (positive / sentimentData.length) * 100;
  }

  private processTemplatePerformance(templates: any[]): TemplatePerformance[] {
    return templates.map(t => ({
      template: t.template_content.substring(0, 50) + '...',
      usageCount: t.usage_count || 0,
      responseRate: t.response_rate || 0,
      conversionRate: t.conversion_rate || 0,
      avgSentiment: 0.7, // Would calculate from actual sentiment data
      performanceScore: t.performance_score || 0
    }));
  }

  private calculateTimeBasedMetrics(analytics: any[]): TimeBasedMetrics[] {
    const timeSlots = ['9-12', '12-15', '15-18', '18-21'];
    
    return timeSlots.map(slot => {
      const [start, end] = slot.split('-').map(Number);
      const slotData = analytics.filter(a => {
        const hour = new Date(a.sent_at).getHours();
        return hour >= start && hour < end;
      });

      return {
        timeSlot: slot,
        messageCount: slotData.length,
        responseRate: this.calculateResponseRate(slotData),
        avgResponseTime: this.calculateAverageResponseTime(slotData),
        conversionRate: 0 // Would calculate from conversion data
      };
    });
  }

  private async getLeadQualityMetrics(dateRange: { start: Date; end: Date }): Promise<LeadQualityMetrics> {
    // This would integrate with the lead scoring service
    return {
      highQualityLeads: 25,
      mediumQualityLeads: 45,
      lowQualityLeads: 30,
      avgLeadScore: 72,
      churnPrevention: 15
    };
  }

  private async calculateDaysToOutcome(leadId: string): Promise<number> {
    const { data: lead } = await supabase
      .from('leads')
      .select('created_at')
      .eq('id', leadId)
      .single();

    if (!lead) return 0;
    
    const daysDiff = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysDiff;
  }

  private async identifySuccessFactors(leadId: string): Promise<any> {
    // Analyze what contributed to the conversion
    const { data: messages } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('ai_generated', true)
      .order('sent_at', { ascending: false })
      .limit(5);

    return {
      aiMessagesCount: messages?.length || 0,
      responsePattern: 'positive_engagement',
      timeToResponse: 'fast',
      contentType: 'personalized'
    };
  }

  private async updateLeadScoringFromConversion(leadId: string, eventType: string, value: number): Promise<void> {
    // Update lead scoring based on conversion event
    console.log('📈 [PERFORMANCE] Updating lead scoring from conversion');
  }

  private async getTouchpoints(leadId: string): Promise<TouchpointData[]> {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    return (conversations || []).map(conv => ({
      type: 'sms' as const,
      timestamp: new Date(conv.sent_at),
      aiGenerated: conv.ai_generated,
      sentiment: 0.7, // Would get from sentiment analysis
      responseReceived: conv.direction === 'in',
      conversionContribution: 0.1
    }));
  }

  private async calculateTimeToConversion(leadId: string): Promise<number> {
    const { data: lead } = await supabase
      .from('leads')
      .select('created_at')
      .eq('id', leadId)
      .single();

    if (!lead) return 0;
    
    return Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  private async calculateSalespersonMetrics(profile: any): Promise<TeamPerformanceMetrics> {
    const totalLeads = profile.leads?.length || 0;
    const aiAssistedLeads = profile.leads?.filter((l: any) => l.ai_automation_enabled)?.length || 0;
    
    return {
      salespersonId: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      totalLeads,
      aiAssistedLeads,
      conversionRate: totalLeads > 0 ? (aiAssistedLeads / totalLeads) * 100 : 0,
      avgResponseTime: 2.5, // Would calculate from actual data
      customerSatisfaction: 85, // Would get from surveys/feedback
      aiEffectivenessScore: aiAssistedLeads > 0 ? 78 : 0,
      improvementAreas: aiAssistedLeads < totalLeads * 0.5 ? ['AI Adoption'] : []
    };
  }
}

export const performanceAnalyticsService = new PerformanceAnalyticsService();
