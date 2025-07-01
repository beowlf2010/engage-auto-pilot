
import { supabase } from '@/integrations/supabase/client';
import { optimizedAIGuard } from './optimizedAIGuard';
import { inventoryAwareAI } from './inventoryAwareAI';
import { advancedPersonalizationEngine } from './advancedPersonalizationEngine';

interface DecisionContext {
  leadId: string;
  messageContent: string;
  conversationHistory: any[];
  leadProfile: any;
  inventoryContext: any;
  urgencyIndicators: string[];
  marketConditions: any;
}

interface IntelligentDecision {
  shouldRespond: boolean;
  responseStrategy: 'immediate' | 'scheduled' | 'escalate' | 'wait';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string[];
  confidence: number;
  recommendations: string[];
  predictedOutcome: any;
}

interface ProactiveIntervention {
  intervention_type: string;
  trigger_conditions: string[];
  suggested_actions: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  auto_executable: boolean;
}

class RealtimeDecisionIntelligenceService {
  private decisionCache = new Map<string, IntelligentDecision>();
  private interventionRules: ProactiveIntervention[] = [];

  async makeIntelligentDecision(
    leadId: string,
    messageContent: string,
    context?: any
  ): Promise<IntelligentDecision> {
    try {
      console.log('🧠 [DECISION-INTEL] Making intelligent decision for:', leadId);

      // Build comprehensive decision context
      const decisionContext = await this.buildDecisionContext(leadId, messageContent, context);

      // Layer 1: Enhanced AI Guard decision
      const guardDecision = await optimizedAIGuard.shouldAIRespond(leadId, messageContent);

      // Layer 2: Predictive analysis
      const predictiveInsights = await this.generatePredictiveInsights(decisionContext);

      // Layer 3: Market and inventory intelligence
      const marketIntelligence = await this.gatherMarketIntelligence(decisionContext);

      // Layer 4: Personalization factors
      const personalizationFactors = await this.getPersonalizationFactors(decisionContext);

      // Synthesize intelligent decision
      const decision = this.synthesizeIntelligentDecision(
        guardDecision,
        predictiveInsights,
        marketIntelligence,
        personalizationFactors,
        decisionContext
      );

      // Cache decision for learning
      this.decisionCache.set(`${leadId}_${Date.now()}`, decision);

      // Check for proactive interventions
      await this.checkProactiveInterventions(decisionContext, decision);

      console.log('✅ [DECISION-INTEL] Decision made:', {
        shouldRespond: decision.shouldRespond,
        strategy: decision.responseStrategy,
        priority: decision.priority,
        confidence: Math.round(decision.confidence * 100) + '%'
      });

      return decision;

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error making intelligent decision:', error);
      
      // Fallback to basic AI guard decision
      const fallbackDecision = await optimizedAIGuard.shouldAIRespond(leadId, messageContent);
      return {
        shouldRespond: fallbackDecision.shouldRespond,
        responseStrategy: 'immediate',
        priority: fallbackDecision.priority,
        reasoning: ['Fallback decision due to intelligence service error'],
        confidence: fallbackDecision.confidence,
        recommendations: [],
        predictedOutcome: null
      };
    }
  }

  private async buildDecisionContext(
    leadId: string,
    messageContent: string,
    additionalContext?: any
  ): Promise<DecisionContext> {
    try {
      // Get lead profile and conversation history
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(20);

      // Get inventory context
      const inventoryInsights = await inventoryAwareAI.getInventoryInsights(leadId);

      // Detect urgency indicators
      const urgencyIndicators = this.detectUrgencyIndicators(messageContent, conversations || []);

      // Get market conditions
      const marketConditions = await this.getCurrentMarketConditions();

      return {
        leadId,
        messageContent,
        conversationHistory: conversations || [],
        leadProfile: lead,
        inventoryContext: inventoryInsights,
        urgencyIndicators,
        marketConditions
      };

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error building decision context:', error);
      return {
        leadId,
        messageContent,
        conversationHistory: [],
        leadProfile: null,
        inventoryContext: null,
        urgencyIndicators: [],
        marketConditions: null
      };
    }
  }

  private detectUrgencyIndicators(messageContent: string, conversations: any[]): string[] {
    const indicators: string[] = [];
    const message = messageContent.toLowerCase();

    // Time-based urgency
    if (message.includes('today') || message.includes('asap') || message.includes('urgent')) {
      indicators.push('immediate_timing');
    }

    // Decision readiness indicators
    if (message.includes('ready to buy') || message.includes('ready to purchase')) {
      indicators.push('purchase_ready');
    }

    // Competitive pressure
    if (message.includes('other dealer') || message.includes('shopping around')) {
      indicators.push('competitive_pressure');
    }

    // Financial urgency
    if (message.includes('financing approved') || message.includes('cash ready')) {
      indicators.push('financial_ready');
    }

    // Conversation momentum
    const recentMessages = conversations.filter(c => 
      new Date(c.sent_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    if (recentMessages.length > 3) {
      indicators.push('high_engagement');
    }

    return indicators;
  }

  private async getCurrentMarketConditions(): Promise<any> {
    try {
      // Get recent inventory movement and pricing trends
      const { data: recentSales } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'sold')
        .gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: currentInventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available');

      if (!recentSales || !currentInventory) return null;

      return {
        salesVelocity: recentSales.length / 30, // Sales per day
        inventoryLevel: currentInventory.length,
        avgDaysOnLot: currentInventory.reduce((sum, v) => sum + (v.days_in_inventory || 0), 0) / currentInventory.length,
        priceCompetitiveness: this.calculatePriceCompetitiveness(currentInventory)
      };

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error getting market conditions:', error);
      return null;
    }
  }

  private calculatePriceCompetitiveness(inventory: any[]): 'high' | 'medium' | 'low' {
    // Simple competitive analysis based on days on lot
    const fastMoving = inventory.filter(v => (v.days_in_inventory || 0) < 30).length;
    const slowMoving = inventory.filter(v => (v.days_in_inventory || 0) > 60).length;
    
    if (fastMoving > slowMoving * 2) return 'high';
    if (slowMoving > fastMoving * 2) return 'low';
    return 'medium';
  }

  private async generatePredictiveInsights(context: DecisionContext): Promise<any> {
    try {
      // Simple predictive model based on patterns
      const conversionProbability = this.calculateConversionProbability(context);
      const optimalResponseTime = this.predictOptimalResponseTime(context);
      const recommendedApproach = this.recommendResponseApproach(context);

      return {
        conversionProbability,
        optimalResponseTime,
        recommendedApproach,
        confidenceLevel: 0.7
      };

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error generating predictive insights:', error);
      return {
        conversionProbability: 0.5,
        optimalResponseTime: 'immediate',
        recommendedApproach: 'standard',
        confidenceLevel: 0.5
      };
    }
  }

  private calculateConversionProbability(context: DecisionContext): number {
    let probability = 0.3; // Base probability

    // Engagement indicators
    if (context.conversationHistory.length > 5) probability += 0.2;
    if (context.urgencyIndicators.includes('purchase_ready')) probability += 0.3;
    if (context.urgencyIndicators.includes('financial_ready')) probability += 0.2;

    // Inventory match
    if (context.inventoryContext?.totalMatching > 0) probability += 0.15;

    // Market conditions
    if (context.marketConditions?.salesVelocity > 1) probability += 0.1;

    return Math.min(probability, 0.95);
  }

  private predictOptimalResponseTime(context: DecisionContext): 'immediate' | 'scheduled' | 'delayed' {
    if (context.urgencyIndicators.includes('immediate_timing')) return 'immediate';
    if (context.urgencyIndicators.includes('high_engagement')) return 'immediate';
    if (context.conversationHistory.length < 2) return 'scheduled';
    return 'immediate';
  }

  private recommendResponseApproach(context: DecisionContext): string {
    if (context.urgencyIndicators.includes('competitive_pressure')) return 'competitive_response';
    if (context.urgencyIndicators.includes('purchase_ready')) return 'closing_approach';
    if (context.inventoryContext?.totalMatching > 0) return 'inventory_focused';
    return 'standard_engagement';
  }

  private async gatherMarketIntelligence(context: DecisionContext): Promise<any> {
    return {
      inventoryUrgency: context.inventoryContext?.totalMatching > 0 ? 'available' : 'limited',
      marketPosition: context.marketConditions?.priceCompetitiveness || 'unknown',
      competitiveAdvantage: context.inventoryContext?.totalMatching > 3 ? 'selection' : 'service'
    };
  }

  private async getPersonalizationFactors(context: DecisionContext): Promise<any> {
    // Get personalization insights without generating a full response
    if (!context.leadProfile) return { style: 'standard', approach: 'neutral' };

    return {
      style: context.conversationHistory.length > 3 ? 'established' : 'introductory',
      approach: context.urgencyIndicators.length > 0 ? 'responsive' : 'nurturing',
      personalizationAvailable: true
    };
  }

  private synthesizeIntelligentDecision(
    guardDecision: any,
    predictiveInsights: any,
    marketIntelligence: any,
    personalizationFactors: any,
    context: DecisionContext
  ): IntelligentDecision {
    let shouldRespond = guardDecision.shouldRespond;
    let responseStrategy: IntelligentDecision['responseStrategy'] = 'immediate';
    let priority = guardDecision.priority;
    const reasoning: string[] = [];
    let confidence = guardDecision.confidence;

    // Override based on intelligence
    if (predictiveInsights.conversionProbability > 0.7) {
      shouldRespond = true;
      priority = 'high';
      reasoning.push('High conversion probability detected');
    }

    if (context.urgencyIndicators.includes('competitive_pressure')) {
      shouldRespond = true;
      responseStrategy = 'immediate';
      priority = 'urgent';
      reasoning.push('Competitive pressure requires immediate response');
    }

    if (context.urgencyIndicators.includes('purchase_ready')) {
      shouldRespond = true;
      responseStrategy = 'immediate';
      priority = 'urgent';
      reasoning.push('Customer appears ready to purchase');
    }

    // Adjust strategy based on market intelligence
    if (marketIntelligence.inventoryUrgency === 'limited') {
      responseStrategy = 'immediate';
      reasoning.push('Limited inventory requires prompt response');
    }

    // Build recommendations
    const recommendations: string[] = [];
    
    if (predictiveInsights.recommendedApproach === 'closing_approach') {
      recommendations.push('Focus on closing techniques');
    }
    
    if (marketIntelligence.competitiveAdvantage === 'selection') {
      recommendations.push('Highlight inventory selection advantage');
    }

    if (personalizationFactors.personalizationAvailable) {
      recommendations.push('Use personalized response approach');
    }

    // Calculate final confidence
    confidence = Math.min(
      (guardDecision.confidence + 
       predictiveInsights.confidenceLevel + 
       (context.urgencyIndicators.length > 0 ? 0.9 : 0.6)) / 3,
      0.95
    );

    return {
      shouldRespond,
      responseStrategy,
      priority,
      reasoning,
      confidence,
      recommendations,
      predictedOutcome: {
        conversionProbability: predictiveInsights.conversionProbability,
        optimalTiming: predictiveInsights.optimalResponseTime,
        expectedEngagement: context.urgencyIndicators.length > 0 ? 'high' : 'medium'
      }
    };
  }

  private async checkProactiveInterventions(
    context: DecisionContext,
    decision: IntelligentDecision
  ): Promise<void> {
    try {
      const interventions: ProactiveIntervention[] = [];

      // Check for urgent situations requiring human intervention
      if (context.urgencyIndicators.includes('competitive_pressure') && decision.confidence < 0.7) {
        interventions.push({
          intervention_type: 'human_escalation',
          trigger_conditions: ['competitive_pressure', 'low_ai_confidence'],
          suggested_actions: ['Alert sales manager', 'Prepare competitive response'],
          urgency_level: 'high',
          auto_executable: true
        });
      }

      // Check for inventory opportunities
      if (context.inventoryContext?.totalMatching > 5 && decision.priority === 'low') {
        interventions.push({
          intervention_type: 'inventory_opportunity',
          trigger_conditions: ['high_inventory_match', 'low_engagement'],
          suggested_actions: ['Proactive inventory presentation', 'Special offer consideration'],
          urgency_level: 'medium',
          auto_executable: false
        });
      }

      // Execute auto-executable interventions
      for (const intervention of interventions.filter(i => i.auto_executable)) {
        await this.executeProactiveIntervention(intervention, context);
      }

      // Log non-executable interventions for human review
      for (const intervention of interventions.filter(i => !i.auto_executable)) {
        await this.logInterventionOpportunity(intervention, context);
      }

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error checking proactive interventions:', error);
    }
  }

  private async executeProactiveIntervention(
    intervention: ProactiveIntervention,
    context: DecisionContext
  ): Promise<void> {
    try {
      console.log(`🚨 [DECISION-INTEL] Executing proactive intervention: ${intervention.intervention_type}`);

      if (intervention.intervention_type === 'human_escalation') {
        // Create high-priority alert
        await supabase
          .from('enhanced_behavioral_triggers')
          .insert({
            lead_id: context.leadId,
            trigger_type: 'ai_escalation_request',
            urgency_level: 'high',
            trigger_data: {
              reason: intervention.trigger_conditions,
              suggested_actions: intervention.suggested_actions,
              context_summary: {
                urgency_indicators: context.urgencyIndicators,
                message_content: context.messageContent.substring(0, 200)
              }
            },
            trigger_score: 90,
            processed: false
          });

        console.log('✅ [DECISION-INTEL] Human escalation alert created');
      }

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error executing proactive intervention:', error);
    }
  }

  private async logInterventionOpportunity(
    intervention: ProactiveIntervention,
    context: DecisionContext
  ): Promise<void> {
    try {
      await supabase
        .from('ai_learning_insights')
        .insert({
          lead_id: context.leadId,
          insight_type: 'proactive_intervention_opportunity',
          insight_title: `${intervention.intervention_type} opportunity detected`,
          insight_description: `Detected opportunity for ${intervention.intervention_type} based on ${intervention.trigger_conditions.join(', ')}`,
          confidence_score: 0.8,
          actionable: true,
          insight_data: {
            intervention,
            context_summary: {
              urgency_indicators: context.urgencyIndicators,
              inventory_matches: context.inventoryContext?.totalMatching || 0
            }
          }
        });

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error logging intervention opportunity:', error);
    }
  }

  async getDecisionIntelligenceInsights(): Promise<any> {
    try {
      const recentDecisions = Array.from(this.decisionCache.values()).slice(-50);
      
      const insights = {
        totalDecisions: recentDecisions.length,
        avgConfidence: recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length,
        responseRate: recentDecisions.filter(d => d.shouldRespond).length / recentDecisions.length,
        strategyBreakdown: this.analyzeStrategyBreakdown(recentDecisions),
        priorityDistribution: this.analyzePriorityDistribution(recentDecisions)
      };

      return insights;

    } catch (error) {
      console.error('❌ [DECISION-INTEL] Error getting insights:', error);
      return null;
    }
  }

  private analyzeStrategyBreakdown(decisions: IntelligentDecision[]): any {
    const strategies = decisions.reduce((acc, d) => {
      acc[d.responseStrategy] = (acc[d.responseStrategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return strategies;
  }

  private analyzePriorityDistribution(decisions: IntelligentDecision[]): any {
    const priorities = decisions.reduce((acc, d) => {
      acc[d.priority] = (acc[d.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return priorities;
  }
}

export const realtimeDecisionIntelligence = new RealtimeDecisionIntelligenceService();
