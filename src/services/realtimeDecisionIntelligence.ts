import { supabase } from '@/integrations/supabase/client';

interface DecisionContext {
  leadId: string;
  messageContent: string;
  conversationHistory: string[];
  leadProfile?: any;
  inventoryContext?: any;
  timeContext?: {
    hourOfDay: number;
    dayOfWeek: number;
    timeZone: string;
  };
}

interface IntelligentDecision {
  shouldRespond: boolean;
  confidence: number;
  reasoning: string[];
  suggestedDelay?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recommendedActions: string[];
}

interface ProactiveIntervention {
  type: 'opportunity' | 'risk' | 'escalation' | 'automation';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedAction: string;
  confidence: number;
  triggerData: any;
}

interface DecisionRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
}

class RealtimeDecisionIntelligenceService {
  private decisionRules: DecisionRule[] = [];
  private decisionCache = new Map<string, IntelligentDecision>();
  private interventionQueue: ProactiveIntervention[] = [];

  async makeIntelligentDecision(
    leadId: string,
    messageContent: string,
    context: any
  ): Promise<IntelligentDecision> {
    try {
      console.log('🧠 [DECISION-AI] Making intelligent decision for lead:', leadId);

      // Create decision context
      const decisionContext: DecisionContext = {
        leadId,
        messageContent,
        conversationHistory: context.conversationHistory || [],
        leadProfile: await this.getLeadProfile(leadId),
        inventoryContext: await this.getInventoryContext(leadId),
        timeContext: this.getTimeContext()
      };

      // Apply decision intelligence layers
      const decision = await this.processDecisionLayers(decisionContext);
      
      // Cache decision for optimization
      this.cacheDecision(leadId, decision);
      
      // Check for proactive interventions
      await this.checkProactiveInterventions(decisionContext, decision);
      
      console.log(`✅ [DECISION-AI] Decision made: ${decision.shouldRespond ? 'RESPOND' : 'WAIT'} (${Math.round(decision.confidence * 100)}% confidence)`);
      return decision;

    } catch (error) {
      console.error('❌ [DECISION-AI] Error making intelligent decision:', error);
      
      // Return safe default decision
      return {
        shouldRespond: true,
        confidence: 0.5,
        reasoning: ['Fallback decision due to error'],
        priority: 'medium',
        recommendedActions: ['send_standard_response']
      };
    }
  }

  private async getLeadProfile(leadId: string): Promise<any> {
    try {
      const { data: leadData } = await supabase
        .from('leads')
        .select(`
          *, 
          ai_conversation_context (
            lead_preferences,
            response_style,
            context_score
          )
        `)
        .eq('id', leadId)
        .single();

      return leadData;
    } catch (error) {
      console.error('❌ [DECISION-AI] Error getting lead profile:', error);
      return null;
    }
  }

  private async getInventoryContext(leadId: string): Promise<any> {
    try {
      // Get lead's vehicle interest and find matching inventory
      const { data: leadData } = await supabase
        .from('leads')
        .select('vehicle_interest, preferred_price_min, preferred_price_max')
        .eq('id', leadId)
        .single();

      if (!leadData?.vehicle_interest) return null;

      // Find matching inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available')
        .limit(5);

      return {
        leadInterest: leadData.vehicle_interest,
        priceRange: {
          min: leadData.preferred_price_min,
          max: leadData.preferred_price_max
        },
        availableMatches: inventory?.length || 0,
        topMatches: inventory?.slice(0, 3) || []
      };
    } catch (error) {
      console.error('❌ [DECISION-AI] Error getting inventory context:', error);
      return null;
    }
  }

  private getTimeContext(): DecisionContext['timeContext'] {
    const now = new Date();
    return {
      hourOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private async processDecisionLayers(context: DecisionContext): Promise<IntelligentDecision> {
    const reasoning: string[] = [];
    let shouldRespond = true;
    let confidence = 0.7;
    let priority: IntelligentDecision['priority'] = 'medium';
    const recommendedActions: string[] = [];

    // Layer 1: Time-based Intelligence
    const timeDecision = this.analyzeTimeContext(context.timeContext!);
    if (!timeDecision.shouldRespond) {
      shouldRespond = false;
      confidence = Math.min(confidence, timeDecision.confidence);
      reasoning.push(...timeDecision.reasoning);
    }

    // Layer 2: Conversation Pattern Analysis
    const conversationDecision = this.analyzeConversationPattern(context);
    confidence = (confidence + conversationDecision.confidence) / 2;
    reasoning.push(...conversationDecision.reasoning);
    
    if (conversationDecision.priority === 'urgent') {
      priority = 'urgent';
      shouldRespond = true; // Override time-based decision for urgent cases
    }

    // Layer 3: Lead Behavior Analysis
    const behaviorDecision = await this.analyzeBehaviorPattern(context);
    confidence = (confidence + behaviorDecision.confidence) / 2;
    reasoning.push(...behaviorDecision.reasoning);

    // Layer 4: Inventory Urgency Analysis
    const inventoryDecision = this.analyzeInventoryUrgency(context);
    if (inventoryDecision.shouldEscalate) {
      priority = 'high';
      recommendedActions.push('highlight_inventory_match');
    }
    reasoning.push(...inventoryDecision.reasoning);

    // Layer 5: Response Fatigue Detection
    const fatigueDecision = await this.detectResponseFatigue(context);
    if (fatigueDecision.shouldPause) {
      shouldRespond = false;
      confidence = Math.min(confidence, 0.3);
      reasoning.push(...fatigueDecision.reasoning);
    }

    return {
      shouldRespond,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
      reasoning,
      priority,
      recommendedActions,
      suggestedDelay: shouldRespond ? 0 : this.calculateOptimalDelay(context)
    };
  }

  private analyzeTimeContext(timeContext: NonNullable<DecisionContext['timeContext']>): Partial<IntelligentDecision> {
    const { hourOfDay, dayOfWeek } = timeContext;
    const reasoning: string[] = [];
    
    // Business hours logic (9 AM - 7 PM, Monday-Saturday)
    const isBusinessHours = hourOfDay >= 9 && hourOfDay <= 19 && dayOfWeek >= 1 && dayOfWeek <= 6;
    
    if (!isBusinessHours) {
      reasoning.push('Outside business hours - response delayed to next business day');
      return {
        shouldRespond: false,
        confidence: 0.9,
        reasoning
      };
    }

    // Peak hours (10 AM - 4 PM)
    const isPeakHours = hourOfDay >= 10 && hourOfDay <= 16;
    if (isPeakHours) {
      reasoning.push('Peak business hours - optimal response time');
      return {
        shouldRespond: true,
        confidence: 0.9,
        reasoning
      };
    }

    reasoning.push('Standard business hours - good response time');
    return {
      shouldRespond: true,
      confidence: 0.7,
      reasoning
    };
  }

  private analyzeConversationPattern(context: DecisionContext): Partial<IntelligentDecision> {
    const { conversationHistory, messageContent } = context;
    const reasoning: string[] = [];
    let confidence = 0.7;
    let priority: IntelligentDecision['priority'] = 'medium';

    // Analyze message urgency
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'now', 'today', 'emergency'];
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      messageContent.toLowerCase().includes(keyword)
    );

    if (hasUrgentKeywords) {
      priority = 'urgent';
      confidence = 0.9;
      reasoning.push('Urgent keywords detected in customer message');
    }

    // Analyze conversation momentum
    const recentMessages = conversationHistory.slice(-5);
    const rapidExchange = recentMessages.length >= 3;
    
    if (rapidExchange) {
      priority = 'high';
      confidence = Math.min(confidence + 0.1, 1.0);
      reasoning.push('Active conversation momentum detected');
    }

    // Check for buying signals
    const buyingSignals = ['price', 'financing', 'test drive', 'appointment', 'visit', 'buy', 'purchase'];
    const hasBuyingSignals = buyingSignals.some(signal => 
      messageContent.toLowerCase().includes(signal)
    );

    if (hasBuyingSignals) {
      priority = 'high';
      confidence = Math.min(confidence + 0.2, 1.0);
      reasoning.push('Buying signals detected - high priority response needed');
    }

    return { confidence, reasoning, priority };
  }

  private async analyzeBehaviorPattern(context: DecisionContext): Promise<Partial<IntelligentDecision>> {
    const reasoning: string[] = [];
    let confidence = 0.7;

    try {
      // Analyze recent AI learning outcomes for this lead
      const { data: outcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('outcome_type, created_at')
        .eq('lead_id', context.leadId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (outcomes && outcomes.length > 0) {
        const positiveOutcomes = outcomes.filter(o => 
          ['positive_response', 'appointment_booked', 'purchase_intent'].includes(o.outcome_type)
        );

        if (positiveOutcomes.length > 0) {
          confidence = Math.min(confidence + 0.1, 1.0);
          reasoning.push('Recent positive engagement history detected');
        }

        const recentNegative = outcomes.filter(o => 
          ['no_response', 'negative_response'].includes(o.outcome_type)
        );

        if (recentNegative.length >= 2) {
          confidence = Math.max(confidence - 0.2, 0.3);
          reasoning.push('Recent negative response pattern - approach cautiously');
        }
      }

      return { confidence, reasoning };

    } catch (error) {
      console.error('❌ [DECISION-AI] Error analyzing behavior pattern:', error);
      return { confidence: 0.5, reasoning: ['Unable to analyze behavior pattern'] };
    }
  }

  private analyzeInventoryUrgency(context: DecisionContext): { shouldEscalate: boolean; reasoning: string[] } {
    const reasoning: string[] = [];
    
    if (!context.inventoryContext) {
      return { shouldEscalate: false, reasoning: ['No inventory context available'] };
    }

    const { availableMatches, topMatches } = context.inventoryContext;
    
    if (availableMatches === 0) {
      reasoning.push('No matching inventory available - low urgency');
      return { shouldEscalate: false, reasoning };
    }

    if (availableMatches <= 2) {
      reasoning.push('Limited matching inventory - high urgency response recommended');
      return { shouldEscalate: true, reasoning };
    }

    // Check for high-demand vehicles (this would be enhanced with real data)
    const highDemandIndicators = topMatches.some((vehicle: any) => 
      vehicle.days_in_inventory < 30 || vehicle.status === 'pending'
    );

    if (highDemandIndicators) {
      reasoning.push('High-demand vehicles detected - escalate response');
      return { shouldEscalate: true, reasoning };
    }

    reasoning.push('Adequate inventory available - standard response');
    return { shouldEscalate: false, reasoning };
  }

  private async detectResponseFatigue(context: DecisionContext): Promise<{ shouldPause: boolean; reasoning: string[] }> {
    const reasoning: string[] = [];

    try {
      // Check recent AI message frequency
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('sent_at, direction')
        .eq('lead_id', context.leadId)
        .eq('ai_generated', true)
        .gte('sent_at', threeDaysAgo.toISOString())
        .order('sent_at', { ascending: false });

      if (!recentMessages) {
        return { shouldPause: false, reasoning: ['No recent message history'] };
      }

      // Check for too many AI messages without responses
      const aiMessages = recentMessages.filter(m => m.direction === 'out');
      const customerResponses = recentMessages.filter(m => m.direction === 'in');

      if (aiMessages.length >= 3 && customerResponses.length === 0) {
        reasoning.push('Multiple AI messages without customer response - pause to avoid fatigue');
        return { shouldPause: true, reasoning };
      }

      // Check for rapid-fire messaging
      if (aiMessages.length >= 2) {
        const lastTwoMessages = aiMessages.slice(0, 2);
        const timeBetween = new Date(lastTwoMessages[0].sent_at).getTime() - 
                           new Date(lastTwoMessages[1].sent_at).getTime();
        
        if (timeBetween < 2 * 60 * 60 * 1000) { // Less than 2 hours
          reasoning.push('Recent AI messages sent too close together - brief pause recommended');
          return { shouldPause: true, reasoning };
        }
      }

      return { shouldPause: false, reasoning: ['No response fatigue detected'] };

    } catch (error) {
      console.error('❌ [DECISION-AI] Error detecting response fatigue:', error);
      return { shouldPause: false, reasoning: ['Unable to analyze response fatigue'] };
    }
  }

  private calculateOptimalDelay(context: DecisionContext): number {
    const baseDelay = 2; // 2 hours default
    const timeContext = context.timeContext!;
    
    // If outside business hours, delay until next business day
    if (timeContext.hourOfDay < 9 || timeContext.hourOfDay > 19) {
      const hoursUntilNextBusiness = timeContext.hourOfDay < 9 
        ? 9 - timeContext.hourOfDay 
        : 24 - timeContext.hourOfDay + 9;
      return hoursUntilNextBusiness;
    }

    return baseDelay;
  }

  private cacheDecision(leadId: string, decision: IntelligentDecision): void {
    this.decisionCache.set(leadId, decision);
    
    // Clean cache periodically (keep last 100 decisions)
    if (this.decisionCache.size > 100) {
      const firstKey = this.decisionCache.keys().next().value;
      this.decisionCache.delete(firstKey);
    }
  }

  private async checkProactiveInterventions(
    context: DecisionContext, 
    decision: IntelligentDecision
  ): Promise<void> {
    try {
      // Check for opportunity interventions
      if (decision.priority === 'urgent' && decision.confidence > 0.8) {
        const intervention: ProactiveIntervention = {
          type: 'opportunity',
          urgency: 'high',
          description: 'High-confidence urgent opportunity detected',
          recommendedAction: 'Immediate human review and personalized response',
          confidence: decision.confidence,
          triggerData: {
            leadId: context.leadId,
            reasoning: decision.reasoning,
            inventoryMatches: context.inventoryContext?.availableMatches || 0
          }
        };

        this.interventionQueue.push(intervention);
      }

      // Check for risk interventions
      if (!decision.shouldRespond && decision.reasoning.includes('fatigue')) {
        const intervention: ProactiveIntervention = {
          type: 'risk',
          urgency: 'medium',
          description: 'Response fatigue detected - risk of customer disengagement',
          recommendedAction: 'Switch to human-driven communication or adjust AI strategy',
          confidence: 0.7,
          triggerData: {
            leadId: context.leadId,
            fatigueIndicators: decision.reasoning
          }
        };

        this.interventionQueue.push(intervention);
      }

      // Store high-priority interventions
      if (this.interventionQueue.length > 0) {
        await this.storeProactiveInterventions();
      }

    } catch (error) {
      console.error('❌ [DECISION-AI] Error checking proactive interventions:', error);
    }
  }

  private async storeProactiveInterventions(): Promise<void> {
    try {
      const criticalInterventions = this.interventionQueue.filter(i => i.urgency === 'critical' || i.urgency === 'high');
      
      for (const intervention of criticalInterventions) {
        // Serialize intervention data properly for database storage
        const insightData = {
          intervention: {
            type: intervention.type,
            urgency: intervention.urgency,
            description: intervention.description,
            recommendedAction: intervention.recommendedAction,
            confidence: intervention.confidence,
            triggerData: intervention.triggerData
          },
          context_summary: {
            urgency_indicators: [intervention.description],
            inventory_matches: intervention.triggerData.inventoryMatches || 0
          }
        };

        await supabase
          .from('ai_learning_insights')
          .insert({
            insight_type: 'proactive_intervention',
            insight_title: `${intervention.type.toUpperCase()}: ${intervention.description}`,
            insight_description: intervention.recommendedAction,
            insight_data: insightData as any,
            confidence_score: intervention.confidence,
            impact_level: intervention.urgency,
            actionable: true,
            lead_id: intervention.triggerData.leadId
          });
      }

      // Clear processed interventions
      this.interventionQueue = this.interventionQueue.filter(i => i.urgency !== 'critical' && i.urgency !== 'high');

    } catch (error) {
      console.error('❌ [DECISION-AI] Error storing proactive interventions:', error);
    }
  }

  async getDecisionIntelligenceInsights(): Promise<any> {
    try {
      const recentDecisions = Array.from(this.decisionCache.values());
      const totalDecisions = recentDecisions.length;
      
      if (totalDecisions === 0) {
        return {
          totalDecisions: 0,
          averageConfidence: 0,
          responseRate: 0,
          topReasons: [],
          priorityDistribution: {}
        };
      }

      const respondDecisions = recentDecisions.filter(d => d.shouldRespond);
      const averageConfidence = recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions;
      
      // Collect all reasoning
      const allReasons = recentDecisions.flatMap(d => d.reasoning);
      const topReasons = this.getTopReasons(allReasons);
      
      // Priority distribution
      const priorityDistribution = recentDecisions.reduce((acc, d) => {
        acc[d.priority] = (acc[d.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalDecisions,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        responseRate: Math.round((respondDecisions.length / totalDecisions) * 100) / 100,
        topReasons: topReasons.slice(0, 5),
        priorityDistribution,
        activeInterventions: this.interventionQueue.length
      };

    } catch (error) {
      console.error('❌ [DECISION-AI] Error getting insights:', error);
      return {
        totalDecisions: 0,
        averageConfidence: 0,
        responseRate: 0,
        topReasons: [],
        priorityDistribution: {},
        activeInterventions: 0
      };
    }
  }

  private getTopReasons(reasons: string[]): Array<{ reason: string; count: number }> {
    const counts = reasons.reduce((acc, reason) => {
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getProactiveInterventions(): Promise<ProactiveIntervention[]> {
    return [...this.interventionQueue];
  }

  async clearInterventionQueue(): Promise<void> {
    this.interventionQueue = [];
  }
}

export const realtimeDecisionIntelligence = new RealtimeDecisionIntelligenceService();
