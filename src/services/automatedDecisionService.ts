
import { supabase } from '@/integrations/supabase/client';
import { predictiveAnalyticsService } from '@/services/predictiveAnalyticsService';
import { realtimeLearningService } from '@/services/realtimeLearningService';

export interface AutomatedDecision {
  id: string;
  type: 'message_timing' | 'content_selection' | 'human_handoff' | 'campaign_trigger';
  leadId: string;
  decision: any;
  confidence: number;
  reasoning: string[];
  executedAt?: Date;
  outcome?: string;
}

export interface DecisionRule {
  id: string;
  name: string;
  conditions: Record<string, any>;
  action: string;
  priority: number;
  isActive: boolean;
}

class AutomatedDecisionService {
  private decisionRules: DecisionRule[] = [
    {
      id: 'high_conversion_fast_track',
      name: 'High Conversion Fast Track',
      conditions: { 
        conversionProbability: { min: 0.8 },
        churnRisk: { max: 0.3 }
      },
      action: 'prioritize_human_contact',
      priority: 1,
      isActive: true
    },
    {
      id: 'churn_prevention',
      name: 'Churn Prevention',
      conditions: { 
        churnRisk: { min: 0.7 },
        daysSinceLastContact: { min: 7 }
      },
      action: 'trigger_reengagement',
      priority: 2,
      isActive: true
    },
    {
      id: 'optimal_timing',
      name: 'Optimal Timing Adjustment',
      conditions: { 
        responseRate: { min: 0.3 },
        hasOptimalTimes: true
      },
      action: 'adjust_message_timing',
      priority: 3,
      isActive: true
    },
    {
      id: 'low_engagement_intervention',
      name: 'Low Engagement Intervention',
      conditions: { 
        messageCount: { min: 5 },
        responseRate: { max: 0.2 }
      },
      action: 'change_message_strategy',
      priority: 4,
      isActive: true
    }
  ];

  // Main decision engine - processes all active leads
  async processAutomatedDecisions(): Promise<AutomatedDecision[]> {
    console.log('🤖 Processing automated decisions...');
    const decisions: AutomatedDecision[] = [];

    try {
      // Get active leads that need decision processing
      const { data: activeLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, last_reply_at, created_at')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .limit(100);

      if (!activeLeads) return decisions;

      for (const lead of activeLeads) {
        const leadDecisions = await this.processLeadDecisions(lead.id);
        decisions.push(...leadDecisions);
      }

      // Execute high-priority decisions
      const highPriorityDecisions = decisions.filter(d => 
        this.getDecisionPriority(d.type) <= 2
      );

      for (const decision of highPriorityDecisions) {
        await this.executeDecision(decision);
      }

      console.log(`✅ Processed ${decisions.length} automated decisions`);
      return decisions;
    } catch (error) {
      console.error('Error processing automated decisions:', error);
      return decisions;
    }
  }

  // Process decisions for a specific lead
  private async processLeadDecisions(leadId: string): Promise<AutomatedDecision[]> {
    const decisions: AutomatedDecision[] = [];

    try {
      // Get lead prediction data
      const prediction = await predictiveAnalyticsService.predictLeadConversion(leadId);
      
      // Get lead interaction data
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!leadData) return decisions;

      // Evaluate each decision rule
      for (const rule of this.decisionRules.filter(r => r.isActive)) {
        if (await this.evaluateRule(rule, prediction, leadData)) {
          const decision = await this.createDecision(rule, leadId, prediction);
          if (decision) {
            decisions.push(decision);
          }
        }
      }

      return decisions;
    } catch (error) {
      console.error(`Error processing decisions for lead ${leadId}:`, error);
      return decisions;
    }
  }

  // Evaluate if a rule conditions are met
  private async evaluateRule(rule: DecisionRule, prediction: any, leadData: any): Promise<boolean> {
    const conditions = rule.conditions;

    // Check conversion probability condition
    if (conditions.conversionProbability) {
      const prob = prediction.conversionProbability;
      if (conditions.conversionProbability.min && prob < conditions.conversionProbability.min) return false;
      if (conditions.conversionProbability.max && prob > conditions.conversionProbability.max) return false;
    }

    // Check churn risk condition
    if (conditions.churnRisk) {
      const risk = prediction.churnRisk;
      if (conditions.churnRisk.min && risk < conditions.churnRisk.min) return false;
      if (conditions.churnRisk.max && risk > conditions.churnRisk.max) return false;
    }

    // Check days since last contact
    if (conditions.daysSinceLastContact) {
      const days = leadData.last_reply_at 
        ? (Date.now() - new Date(leadData.last_reply_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      if (conditions.daysSinceLastContact.min && days < conditions.daysSinceLastContact.min) return false;
      if (conditions.daysSinceLastContact.max && days > conditions.daysSinceLastContact.max) return false;
    }

    // Check response rate
    if (conditions.responseRate) {
      const rate = prediction.predictionFactors.responseRate || 0;
      if (conditions.responseRate.min && rate < conditions.responseRate.min) return false;
      if (conditions.responseRate.max && rate > conditions.responseRate.max) return false;
    }

    // Check message count
    if (conditions.messageCount) {
      const count = prediction.predictionFactors.messageCount || 0;
      if (conditions.messageCount.min && count < conditions.messageCount.min) return false;
      if (conditions.messageCount.max && count > conditions.messageCount.max) return false;
    }

    // Check if has optimal times
    if (conditions.hasOptimalTimes) {
      if (prediction.optimalContactTimes.length === 0) return false;
    }

    return true;
  }

  // Create a decision based on rule and data
  private async createDecision(rule: DecisionRule, leadId: string, prediction: any): Promise<AutomatedDecision | null> {
    const confidence = this.calculateDecisionConfidence(rule, prediction);
    
    let decision: any = {};
    let reasoning: string[] = [];

    switch (rule.action) {
      case 'prioritize_human_contact':
        decision = {
          action: 'human_handoff',
          priority: 'high',
          reason: 'High conversion probability detected'
        };
        reasoning = [
          `Conversion probability: ${(prediction.conversionProbability * 100).toFixed(1)}%`,
          `Predicted value: $${prediction.predictedValue.toLocaleString()}`,
          'Optimal for human engagement'
        ];
        break;

      case 'trigger_reengagement':
        decision = {
          action: 'campaign_trigger',
          campaignType: 'reengagement',
          urgency: 'high'
        };
        reasoning = [
          `Churn risk: ${(prediction.churnRisk * 100).toFixed(1)}%`,
          'Extended silence period detected',
          'Immediate re-engagement needed'
        ];
        break;

      case 'adjust_message_timing':
        decision = {
          action: 'message_timing',
          optimalTimes: prediction.optimalContactTimes,
          currentTiming: 'suboptimal'
        };
        reasoning = [
          'Historical response patterns identified',
          `Optimal times: ${prediction.optimalContactTimes.join(', ')}`,
          'Timing optimization recommended'
        ];
        break;

      case 'change_message_strategy':
        decision = {
          action: 'content_selection',
          newStrategy: 'personalized_approach',
          reason: 'Low engagement with current strategy'
        };
        reasoning = [
          `Current response rate: ${(prediction.predictionFactors.responseRate * 100).toFixed(1)}%`,
          'Multiple messages sent without engagement',
          'Strategy change required'
        ];
        break;

      default:
        return null;
    }

    return {
      id: `${rule.id}_${leadId}_${Date.now()}`,
      type: this.mapActionToDecisionType(rule.action),
      leadId,
      decision,
      confidence,
      reasoning
    };
  }

  // Map rule action to decision type
  private mapActionToDecisionType(action: string): AutomatedDecision['type'] {
    switch (action) {
      case 'prioritize_human_contact': return 'human_handoff';
      case 'trigger_reengagement': return 'campaign_trigger';
      case 'adjust_message_timing': return 'message_timing';
      case 'change_message_strategy': return 'content_selection';
      default: return 'content_selection';
    }
  }

  // Calculate confidence score for a decision
  private calculateDecisionConfidence(rule: DecisionRule, prediction: any): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on prediction certainty
    if (prediction.conversionProbability > 0.8) confidence += 0.2;
    if (prediction.churnRisk > 0.7) confidence += 0.2;
    
    // Adjust based on data quality
    if (prediction.predictionFactors.messageCount > 5) confidence += 0.1;
    if (prediction.predictionFactors.responseRate > 0.3) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  // Execute a decision
  private async executeDecision(decision: AutomatedDecision): Promise<void> {
    try {
      console.log(`🎯 Executing decision: ${decision.type} for lead ${decision.leadId}`);

      switch (decision.type) {
        case 'human_handoff':
          await this.executeHumanHandoff(decision);
          break;
        case 'campaign_trigger':
          await this.executeCampaignTrigger(decision);
          break;
        case 'message_timing':
          await this.executeTimingAdjustment(decision);
          break;
        case 'content_selection':
          await this.executeContentStrategy(decision);
          break;
      }

      // Record the decision execution
      decision.executedAt = new Date();
      await this.recordDecision(decision);

    } catch (error) {
      console.error(`Error executing decision ${decision.id}:`, error);
    }
  }

  // Execute human handoff
  private async executeHumanHandoff(decision: AutomatedDecision): Promise<void> {
    await supabase
      .from('leads')
      .update({
        ai_sequence_paused: true,
        notes: `AI Decision: High-value lead flagged for human contact. Conversion probability: ${decision.confidence * 100}%`
      })
      .eq('id', decision.leadId);

    console.log(`👤 Human handoff triggered for lead ${decision.leadId}`);
  }

  // Execute campaign trigger
  private async executeCampaignTrigger(decision: AutomatedDecision): Promise<void> {
    // Trigger re-engagement message through learning service
    await realtimeLearningService.processLearningEvent({
      type: 'feedback_submitted',
      leadId: decision.leadId,
      data: {
        trigger: 'automated_reengagement',
        urgency: decision.decision.urgency,
        reason: 'churn_prevention'
      },
      timestamp: new Date()
    });

    console.log(`📢 Re-engagement campaign triggered for lead ${decision.leadId}`);
  }

  // Execute timing adjustment
  private async executeTimingAdjustment(decision: AutomatedDecision): Promise<void> {
    await supabase
      .from('lead_contact_timing')
      .upsert({
        lead_id: decision.leadId,
        best_contact_hours: decision.decision.optimalTimes,
        last_optimal_contact: new Date().toISOString()
      });

    console.log(`⏰ Timing optimization applied for lead ${decision.leadId}`);
  }

  // Execute content strategy change
  private async executeContentStrategy(decision: AutomatedDecision): Promise<void> {
    await supabase
      .from('lead_communication_patterns')
      .upsert({
        lead_id: decision.leadId,
        preferred_tone: 'personalized',
        content_preferences: {
          strategy: decision.decision.newStrategy,
          reason: decision.decision.reason,
          applied_at: new Date().toISOString()
        }
      });

    console.log(`💬 Content strategy updated for lead ${decision.leadId}`);
  }

  // Record decision for analytics
  private async recordDecision(decision: AutomatedDecision): Promise<void> {
    // This would typically go to a decisions table, but for now we'll use the existing structure
    console.log(`📊 Decision recorded: ${decision.type} for lead ${decision.leadId}`);
  }

  // Get decision priority
  private getDecisionPriority(type: AutomatedDecision['type']): number {
    const priorities = {
      'human_handoff': 1,
      'campaign_trigger': 2,
      'message_timing': 3,
      'content_selection': 4
    };
    return priorities[type] || 5;
  }

  // Get decision insights for dashboard
  async getDecisionInsights(): Promise<any> {
    // This would analyze recent decisions and their outcomes
    return {
      totalDecisions: 0,
      successfulDecisions: 0,
      pendingDecisions: 0,
      decisionTypes: [],
      recommendations: []
    };
  }
}

export const automatedDecisionService = new AutomatedDecisionService();
