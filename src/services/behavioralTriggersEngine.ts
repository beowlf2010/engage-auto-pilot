
import { supabase } from '@/integrations/supabase/client';
import { predictiveAnalyticsService } from './predictiveAnalyticsService';
import { realtimeLearningEngine } from './realtimeLearningEngine';

export interface BehavioralTrigger {
  id: string;
  leadId: string;
  triggerType: 'engagement_drop' | 'high_intent' | 'price_inquiry' | 'competitor_mention' | 'urgency_signal';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  context: any;
  recommendedAction: string;
  detectedAt: Date;
  processedAt?: Date;
}

export interface TriggerRule {
  type: string;
  conditions: any[];
  action: string;
  urgencyLevel: string;
  isActive: boolean;
}

class BehavioralTriggersEngine {
  private rules: TriggerRule[] = [
    {
      type: 'engagement_drop',
      conditions: [
        { metric: 'daysSinceLastReply', operator: '>', value: 7 },
        { metric: 'previousEngagement', operator: '>', value: 0.3 }
      ],
      action: 'Send re-engagement message with special offer',
      urgencyLevel: 'medium',
      isActive: true
    },
    {
      type: 'high_intent',
      conditions: [
        { metric: 'priceInquiries', operator: '>', value: 2 },
        { metric: 'responseRate', operator: '>', value: 0.6 }
      ],
      action: 'Schedule immediate follow-up call',
      urgencyLevel: 'high',
      isActive: true
    },
    {
      type: 'competitor_mention',
      conditions: [
        { metric: 'competitorKeywords', operator: '>', value: 0 }
      ],
      action: 'Send competitive comparison with advantages',
      urgencyLevel: 'high',
      isActive: true
    },
    {
      type: 'urgency_signal',
      conditions: [
        { metric: 'urgencyKeywords', operator: '>', value: 0 },
        { metric: 'timeframe', operator: '<', value: 7 }
      ],
      action: 'Expedite process and offer immediate assistance',
      urgencyLevel: 'critical',
      isActive: true
    }
  ];

  // Process behavioral triggers for all active leads
  async processBehavioralTriggers(): Promise<BehavioralTrigger[]> {
    console.log('🎯 [TRIGGERS] Processing behavioral triggers...');
    
    const triggers: BehavioralTrigger[] = [];

    try {
      // Get active leads for analysis
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, last_reply_at, created_at')
        .eq('ai_opt_in', true)
        .limit(50);

      if (!leads) return triggers;

      for (const lead of leads) {
        const leadTriggers = await this.analyzeLead(lead);
        triggers.push(...leadTriggers);
      }

      // Store triggers in database
      await this.storeTriggers(triggers);

      console.log(`🎯 [TRIGGERS] Generated ${triggers.length} behavioral triggers`);
      
    } catch (error) {
      console.error('❌ [TRIGGERS] Error processing behavioral triggers:', error);
    }

    return triggers;
  }

  // Analyze individual lead for behavioral triggers
  private async analyzeLead(lead: any): Promise<BehavioralTrigger[]> {
    const triggers: BehavioralTrigger[] = [];

    try {
      // Get lead's conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: true });

      if (!conversations || conversations.length === 0) return triggers;

      // Get lead's behavioral context
      const context = await this.buildLeadContext(lead, conversations);

      // Check each trigger rule
      for (const rule of this.rules) {
        if (!rule.isActive) continue;

        const triggerFired = this.evaluateRule(rule, context);
        
        if (triggerFired) {
          const trigger: BehavioralTrigger = {
            id: `${rule.type}_${lead.id}_${Date.now()}`,
            leadId: lead.id,
            triggerType: rule.type as any,
            urgencyLevel: rule.urgencyLevel as any,
            confidence: triggerFired.confidence,
            context: {
              leadName: `${lead.first_name} ${lead.last_name}`,
              vehicleInterest: lead.vehicle_interest,
              ...triggerFired.context
            },
            recommendedAction: rule.action,
            detectedAt: new Date()
          };

          triggers.push(trigger);

          // Log trigger for learning
          await realtimeLearningEngine.processLearningEvent({
            type: 'response_received',
            leadId: lead.id,
            data: {
              triggerType: rule.type,
              urgencyLevel: rule.urgencyLevel,
              confidence: triggerFired.confidence
            },
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      console.error(`Error analyzing lead ${lead.id}:`, error);
    }

    return triggers;
  }

  // Build comprehensive context for lead analysis
  private async buildLeadContext(lead: any, conversations: any[]): Promise<any> {
    const now = new Date();
    const leadCreated = new Date(lead.created_at);
    const lastReply = lead.last_reply_at ? new Date(lead.last_reply_at) : null;

    // Basic metrics
    const daysSinceCreated = (now.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceLastReply = lastReply 
      ? (now.getTime() - lastReply.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Conversation analysis
    const totalMessages = conversations.length;
    const customerMessages = conversations.filter(c => c.direction === 'in');
    const ourMessages = conversations.filter(c => c.direction === 'out');
    const responseRate = ourMessages.length > 0 ? customerMessages.length / ourMessages.length : 0;

    // Content analysis
    const allCustomerText = customerMessages.map(m => m.body.toLowerCase()).join(' ');
    const priceInquiries = this.countKeywords(allCustomerText, [
      'price', 'cost', 'how much', 'payment', 'finance', 'lease', 'monthly', 'down payment'
    ]);
    const urgencyKeywords = this.countKeywords(allCustomerText, [
      'asap', 'urgent', 'quickly', 'soon', 'today', 'tomorrow', 'this week', 'need now'
    ]);
    const competitorKeywords = this.countKeywords(allCustomerText, [
      'toyota', 'honda', 'ford', 'nissan', 'hyundai', 'kia', 'subaru', 'mazda',
      'other dealer', 'better price', 'comparing', 'shop around'
    ]);

    // Engagement patterns
    const recentMessages = conversations.filter(c => {
      const msgDate = new Date(c.sent_at);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return msgDate > weekAgo;
    });
    const recentEngagement = recentMessages.filter(c => c.direction === 'in').length;

    // Previous engagement level (for comparison)
    const olderMessages = conversations.filter(c => {
      const msgDate = new Date(c.sent_at);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return msgDate > twoWeeksAgo && msgDate <= oneWeekAgo;
    });
    const previousEngagement = olderMessages.length > 0 
      ? olderMessages.filter(c => c.direction === 'in').length / olderMessages.length 
      : 0;

    // Sentiment analysis (simple)
    const sentiment = this.analyzeSentiment(allCustomerText);

    // Timeframe detection
    const timeframeKeywords = [
      'this week', 'next week', 'this month', 'soon', 'quickly', 'end of month'
    ];
    const hasTimeframe = timeframeKeywords.some(keyword => allCustomerText.includes(keyword));
    const estimatedTimeframe = hasTimeframe ? 7 : 30; // days

    return {
      // Time metrics
      daysSinceCreated,
      daysSinceLastReply,
      
      // Engagement metrics
      totalMessages,
      responseRate,
      recentEngagement,
      previousEngagement,
      
      // Content metrics
      priceInquiries,
      urgencyKeywords,
      competitorKeywords,
      sentiment,
      
      // Intent metrics
      timeframe: estimatedTimeframe,
      hasSpecificInterest: lead.vehicle_interest && 
        !lead.vehicle_interest.includes('finding the right vehicle'),
      
      // Raw data for detailed analysis
      customerMessageCount: customerMessages.length,
      lastMessageContent: customerMessages[customerMessages.length - 1]?.body || '',
      conversationHistory: conversations
    };
  }

  // Evaluate trigger rule against lead context
  private evaluateRule(rule: TriggerRule, context: any): { confidence: number; context: any } | null {
    let conditionsMet = 0;
    let totalConditions = rule.conditions.length;
    const detailContext: any = {};

    for (const condition of rule.conditions) {
      const value = context[condition.metric];
      let met = false;

      switch (condition.operator) {
        case '>':
          met = value > condition.value;
          break;
        case '<':
          met = value < condition.value;
          break;
        case '>=':
          met = value >= condition.value;
          break;
        case '<=':
          met = value <= condition.value;
          break;
        case '==':
          met = value === condition.value;
          break;
      }

      if (met) {
        conditionsMet++;
        detailContext[condition.metric] = value;
      }
    }

    // Calculate confidence based on how many conditions were met
    const confidence = conditionsMet / totalConditions;

    // Require at least 70% of conditions to be met
    if (confidence >= 0.7) {
      return {
        confidence,
        context: {
          ...detailContext,
          conditionsMet,
          totalConditions,
          triggerDetails: this.getDetailedTriggerContext(rule.type, context)
        }
      };
    }

    return null;
  }

  // Get detailed context for specific trigger types
  private getDetailedTriggerContext(triggerType: string, context: any): any {
    switch (triggerType) {
      case 'engagement_drop':
        return {
          previousEngagement: Math.round(context.previousEngagement * 100),
          currentEngagement: Math.round((context.recentEngagement / Math.max(1, context.totalMessages * 0.1)) * 100),
          daysSinceLastReply: Math.round(context.daysSinceLastReply)
        };
        
      case 'high_intent':
        return {
          priceInquiries: context.priceInquiries,
          responseRate: Math.round(context.responseRate * 100),
          sentiment: context.sentiment
        };
        
      case 'competitor_mention':
        return {
          competitorMentions: context.competitorKeywords,
          lastMessage: context.lastMessageContent,
          responseRate: Math.round(context.responseRate * 100)
        };
        
      case 'urgency_signal':
        return {
          urgencyIndicators: context.urgencyKeywords,
          timeframe: context.timeframe,
          hasSpecificInterest: context.hasSpecificInterest
        };
        
      default:
        return context;
    }
  }

  // Helper methods
  private countKeywords(text: string, keywords: string[]): number {
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private analyzeSentiment(text: string): number {
    const positiveWords = [
      'interested', 'yes', 'great', 'good', 'perfect', 'love', 'like', 'want', 'need',
      'sounds good', 'looks good', 'perfect', 'excellent'
    ];
    const negativeWords = [
      'not interested', 'no', 'stop', 'expensive', 'too much', 'busy', 'maybe later',
      'not now', 'cant afford', 'not ready'
    ];

    let sentiment = 0.5; // Neutral baseline
    
    positiveWords.forEach(word => {
      if (text.includes(word)) sentiment += 0.1;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) sentiment -= 0.15;
    });

    return Math.max(0, Math.min(1, sentiment));
  }

  // Store triggers in database
  private async storeTriggers(triggers: BehavioralTrigger[]): Promise<void> {
    for (const trigger of triggers) {
      try {
        await supabase.from('enhanced_behavioral_triggers').insert({
          lead_id: trigger.leadId,
          trigger_type: trigger.triggerType,
          urgency_level: trigger.urgencyLevel,
          trigger_score: Math.round(trigger.confidence * 100),
          trigger_data: {
            context: trigger.context,
            recommendedAction: trigger.recommendedAction,
            confidence: trigger.confidence
          },
          created_at: trigger.detectedAt.toISOString()
        });
      } catch (error) {
        console.error(`Error storing trigger for lead ${trigger.leadId}:`, error);
      }
    }
  }

  // Get pending triggers for processing
  async getPendingTriggers(limit = 20): Promise<BehavioralTrigger[]> {
    const { data } = await supabase
      .from('enhanced_behavioral_triggers')
      .select(`
        *,
        leads(first_name, last_name, vehicle_interest)
      `)
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data?.map(row => ({
      id: row.id,
      leadId: row.lead_id,
      triggerType: row.trigger_type as BehavioralTrigger['triggerType'],
      urgencyLevel: row.urgency_level as BehavioralTrigger['urgencyLevel'],
      confidence: (row.trigger_data as any)?.confidence || 0.5,
      context: {
        leadName: `${row.leads?.first_name} ${row.leads?.last_name}`,
        vehicleInterest: row.leads?.vehicle_interest,
        ...(row.trigger_data as any)?.context
      },
      recommendedAction: (row.trigger_data as any)?.recommendedAction || 'Follow up',
      detectedAt: new Date(row.created_at),
      processedAt: row.processed ? new Date() : undefined
    })) || [];
  }

  // Mark trigger as processed
  async markTriggerProcessed(triggerId: string): Promise<void> {
    await supabase
      .from('enhanced_behavioral_triggers')
      .update({ processed: true })
      .eq('id', triggerId);
  }
}

export const behavioralTriggersEngine = new BehavioralTriggersEngine();
