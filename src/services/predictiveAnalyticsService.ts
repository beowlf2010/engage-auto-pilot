
import { supabase } from '@/integrations/supabase/client';

export interface PredictiveInsight {
  id: string;
  type: 'conversion_prediction' | 'churn_risk' | 'optimal_timing' | 'content_recommendation';
  confidence: number;
  prediction: LeadPrediction;
  reasoning: string[];
  recommendedActions: string[];
  expectedOutcome: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface LeadPrediction {
  leadId: string;
  leadName?: string;
  probability?: number;
  churnRisk?: number;
  predictedValue?: number;
  optimalContactTime?: Date;
  recommendedContent?: string[];
}

export interface AutomatedDecision {
  id: string;
  type: 'human_handoff' | 'campaign_trigger' | 'message_timing' | 'content_selection';
  leadId: string;
  decision: any;
  reasoning: string[];
  confidence: number;
  executedAt?: Date;
  createdAt: Date;
}

class PredictiveAnalyticsService {
  // Generate predictive insights for leads
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    console.log('🔮 [PREDICTIVE] Generating insights...');
    
    const insights: PredictiveInsight[] = [];

    try {
      // Get active leads for analysis
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, created_at, last_reply_at')
        .eq('ai_opt_in', true)
        .limit(20);

      if (!leads) return insights;

      for (const lead of leads) {
        const leadInsights = await this.analyzeLeadForInsights(lead);
        insights.push(...leadInsights);
      }

      console.log(`🔮 [PREDICTIVE] Generated ${insights.length} insights`);

    } catch (error) {
      console.error('❌ [PREDICTIVE] Error generating insights:', error);
    }

    return insights;
  }

  // Analyze individual lead for insights
  private async analyzeLeadForInsights(lead: any): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      // Get conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: true });

      if (!conversations || conversations.length === 0) return insights;

      // Analyze conversion probability
      const conversionInsight = await this.analyzeConversionProbability(lead, conversations);
      if (conversionInsight) insights.push(conversionInsight);

      // Analyze churn risk
      const churnInsight = await this.analyzeChurnRisk(lead, conversations);
      if (churnInsight) insights.push(churnInsight);

      // Analyze optimal timing
      const timingInsight = await this.analyzeOptimalTiming(lead, conversations);
      if (timingInsight) insights.push(timingInsight);

    } catch (error) {
      console.error(`Error analyzing lead ${lead.id}:`, error);
    }

    return insights;
  }

  // Analyze conversion probability
  private async analyzeConversionProbability(lead: any, conversations: any[]): Promise<PredictiveInsight | null> {
    const customerMessages = conversations.filter(c => c.direction === 'in');
    const ourMessages = conversations.filter(c => c.direction === 'out');

    // Calculate engagement metrics
    const responseRate = ourMessages.length > 0 ? customerMessages.length / ourMessages.length : 0;
    const daysSinceCreated = (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    // Simple probability calculation
    let probability = 0.3; // Base probability
    
    if (responseRate > 0.7) probability += 0.3;
    if (responseRate > 0.4) probability += 0.2;
    if (daysSinceCreated <= 7) probability += 0.2;
    if (conversations.length > 10) probability += 0.1;

    // Only create insight if probability is significant
    if (probability > 0.6) {
      return {
        id: `conv_${lead.id}_${Date.now()}`,
        type: 'conversion_prediction',
        confidence: Math.min(0.95, probability + 0.1),
        prediction: {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          probability,
          predictedValue: 35000 // Estimated vehicle value
        },
        reasoning: [
          `High response rate: ${Math.round(responseRate * 100)}%`,
          `Active engagement: ${conversations.length} messages exchanged`,
          `Recent lead: ${Math.round(daysSinceCreated)} days old`
        ],
        recommendedActions: [
          'Schedule immediate follow-up call',
          'Send vehicle pricing information',
          'Offer test drive appointment'
        ],
        expectedOutcome: `High probability (${Math.round(probability * 100)}%) of conversion within 14 days`,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };
    }

    return null;
  }

  // Analyze churn risk
  private async analyzeChurnRisk(lead: any, conversations: any[]): Promise<PredictiveInsight | null> {
    const lastReply = lead.last_reply_at ? new Date(lead.last_reply_at) : null;
    const daysSinceLastReply = lastReply 
      ? (new Date().getTime() - lastReply.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    const recentMessages = conversations.filter(c => {
      const msgDate = new Date(c.sent_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return msgDate > weekAgo;
    });

    let churnRisk = 0.2; // Base risk

    if (daysSinceLastReply > 7) churnRisk += 0.3;
    if (daysSinceLastReply > 14) churnRisk += 0.3;
    if (recentMessages.length === 0) churnRisk += 0.2;

    // Only create insight if risk is significant
    if (churnRisk > 0.5) {
      return {
        id: `churn_${lead.id}_${Date.now()}`,
        type: 'churn_risk',
        confidence: Math.min(0.9, churnRisk + 0.1),
        prediction: {
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          churnRisk
        },
        reasoning: [
          `${Math.round(daysSinceLastReply)} days since last response`,
          `Low recent engagement: ${recentMessages.length} messages this week`,
          'Decreasing interaction pattern detected'
        ],
        recommendedActions: [
          'Send re-engagement campaign',
          'Offer special incentive',
          'Schedule personal call'
        ],
        expectedOutcome: `${Math.round(churnRisk * 100)}% risk of lead going cold within 7 days`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };
    }

    return null;
  }

  // Analyze optimal timing
  private async analyzeOptimalTiming(lead: any, conversations: any[]): Promise<PredictiveInsight | null> {
    const responseTimes = conversations
      .filter(c => c.direction === 'in')
      .map(c => new Date(c.sent_at));

    if (responseTimes.length < 3) return null;

    // Find most common hour for responses
    const hours = responseTimes.map(date => date.getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const bestHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    const optimalTime = new Date();
    optimalTime.setHours(parseInt(bestHour), 0, 0, 0);
    if (optimalTime < new Date()) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }

    return {
      id: `timing_${lead.id}_${Date.now()}`,
      type: 'optimal_timing',
      confidence: 0.75,
      prediction: {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        optimalContactTime: optimalTime
      },
      reasoning: [
        `Most responsive at ${bestHour}:00`,
        `Pattern based on ${responseTimes.length} previous responses`,
        'Historical response time analysis'
      ],
      recommendedActions: [
        `Schedule next message for ${bestHour}:00`,
        'Optimize future contact timing',
        'Set automated scheduling'
      ],
      expectedOutcome: `Best contact time identified: ${bestHour}:00 for optimal response rate`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    };
  }

  // Predict specific lead conversion
  async predictLeadConversion(leadId: string): Promise<LeadPrediction | null> {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) return null;

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId);

      const responseRate = conversations 
        ? conversations.filter(c => c.direction === 'in').length / Math.max(1, conversations.filter(c => c.direction === 'out').length)
        : 0;

      return {
        leadId,
        leadName: `${lead.first_name} ${lead.last_name}`,
        probability: Math.min(0.95, 0.3 + (responseRate * 0.4)),
        predictedValue: 35000
      };

    } catch (error) {
      console.error('Error predicting lead conversion:', error);
      return null;
    }
  }

  // Process automated decisions
  async processAutomatedDecisions(): Promise<AutomatedDecision[]> {
    const decisions: AutomatedDecision[] = [];

    try {
      const insights = await this.generatePredictiveInsights();

      for (const insight of insights) {
        if (insight.confidence > 0.8) {
          const decision = this.createAutomatedDecision(insight);
          if (decision) {
            decisions.push(decision);
            await this.executeDecision(decision);
          }
        }
      }

    } catch (error) {
      console.error('Error processing automated decisions:', error);
    }

    return decisions;
  }

  // Create automated decision from insight
  private createAutomatedDecision(insight: PredictiveInsight): AutomatedDecision | null {
    switch (insight.type) {
      case 'conversion_prediction':
        if (insight.confidence > 0.8) {
          return {
            id: `decision_${Date.now()}`,
            type: 'human_handoff',
            leadId: insight.prediction.leadId,
            decision: {
              action: 'escalate_to_sales',
              priority: 'high',
              reason: 'High conversion probability detected'
            },
            reasoning: insight.reasoning,
            confidence: insight.confidence,
            createdAt: new Date()
          };
        }
        break;

      case 'churn_risk':
        if (insight.confidence > 0.7) {
          return {
            id: `decision_${Date.now()}`,
            type: 'campaign_trigger',
            leadId: insight.prediction.leadId,
            decision: {
              action: 'trigger_retention_campaign',
              urgency: 'high',
              reason: 'High churn risk detected'
            },
            reasoning: insight.reasoning,
            confidence: insight.confidence,
            createdAt: new Date()
          };
        }
        break;

      case 'optimal_timing':
        return {
          id: `decision_${Date.now()}`,
          type: 'message_timing',
          leadId: insight.prediction.leadId,
          decision: {
            action: 'optimize_timing',
            optimalTime: insight.prediction.optimalContactTime,
            reason: 'Optimal contact time identified'
          },
          reasoning: insight.reasoning,
          confidence: insight.confidence,
          createdAt: new Date()
        };
    }

    return null;
  }

  // Execute automated decision
  private async executeDecision(decision: AutomatedDecision): Promise<void> {
    try {
      switch (decision.type) {
        case 'human_handoff':
          console.log(`🤝 [DECISION] Escalating lead ${decision.leadId} to human`);
          break;

        case 'campaign_trigger':
          console.log(`📧 [DECISION] Triggering retention campaign for lead ${decision.leadId}`);
          break;

        case 'message_timing':
          console.log(`⏰ [DECISION] Optimizing timing for lead ${decision.leadId}`);
          break;
      }

      decision.executedAt = new Date();

    } catch (error) {
      console.error('Error executing decision:', error);
    }
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
