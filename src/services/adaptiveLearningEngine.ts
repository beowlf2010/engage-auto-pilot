import { supabase } from '@/integrations/supabase/client';
import { predictiveSchedulingEngine } from './predictiveSchedulingEngine';

interface LearningEvent {
  eventId: string;
  leadId: string;
  messageId?: string;
  eventType: 'response_received' | 'no_response' | 'positive_engagement' | 'negative_engagement' | 'conversion' | 'unsubscribe';
  eventData: any;
  contextFactors: {
    templateUsed?: string;
    timing: Date;
    leadCharacteristics: any;
    messageCharacteristics: any;
  };
  outcomeMetrics: {
    responseTime?: number;
    engagementScore?: number;
    conversionValue?: number;
  };
  timestamp: Date;
}

interface TemplateEvolution {
  originalTemplate: string;
  evolvedTemplate: string;
  improvementScore: number;
  testingSample: number;
  confidence: number;
  successMetrics: {
    responseRate: number;
    engagementRate: number;
    conversionRate: number;
  };
  evolutionReason: string;
}

interface ConversationPattern {
  patternId: string;
  patternType: 'successful_conversion' | 'engagement_decline' | 're_engagement' | 'objection_handling';
  triggerConditions: string[];
  successRate: number;
  averageTimeToOutcome: number;
  recommendedActions: string[];
  contextFactors: any;
}

interface PredictedOutcome {
  leadId: string;
  conversationId?: string;
  predictedOutcome: 'conversion' | 'continued_engagement' | 'disengagement' | 'escalation_needed';
  confidence: number;
  timeToOutcome: number;
  contributingFactors: string[];
  recommendedActions: string[];
  riskFactors: string[];
}

export class AdaptiveLearningEngine {
  private static instance: AdaptiveLearningEngine;
  private learningEvents = new Map<string, LearningEvent[]>();
  private conversationPatterns = new Map<string, ConversationPattern>();
  private templateEvolutions = new Map<string, TemplateEvolution>();
  private isLearning = false;

  static getInstance(): AdaptiveLearningEngine {
    if (!AdaptiveLearningEngine.instance) {
      AdaptiveLearningEngine.instance = new AdaptiveLearningEngine();
    }
    return AdaptiveLearningEngine.instance;
  }

  async captureResponse(
    leadId: string,
    messageId: string,
    responseReceived: boolean,
    responseData?: {
      responseTime: number;
      responseContent: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      engagementLevel: number;
    }
  ): Promise<void> {
    console.log('📚 [LEARNING ENGINE] Capturing response data for:', leadId);

    try {
      // Get message context
      const messageContext = await this.getMessageContext(messageId);
      const leadContext = await this.getLeadContext(leadId);

      // Create learning event
      const event: LearningEvent = {
        eventId: crypto.randomUUID(),
        leadId,
        messageId,
        eventType: responseReceived ? 'response_received' : 'no_response',
        eventData: responseData || {},
        contextFactors: {
          templateUsed: messageContext?.templateHash,
          timing: new Date(),
          leadCharacteristics: leadContext,
          messageCharacteristics: messageContext
        },
        outcomeMetrics: {
          responseTime: responseData?.responseTime,
          engagementScore: responseData?.engagementLevel
        },
        timestamp: new Date()
      };

      // Store the learning event
      await this.storeLearningEvent(event);

      // Trigger real-time learning
      await this.processLearningEvent(event);

      console.log('✅ [LEARNING ENGINE] Response captured and processed');

    } catch (error) {
      console.error('❌ [LEARNING ENGINE] Error capturing response:', error);
    }
  }

  async evolveBestPerformingTemplates(): Promise<TemplateEvolution[]> {
    console.log('🧬 [LEARNING ENGINE] Evolving high-performing templates...');

    try {
      // Get top performing templates
      const { data: topTemplates } = await supabase
        .from('ai_template_performance')
        .select('*')
        .gt('response_rate', 0.4) // Above 40% response rate
        .gt('usage_count', 10)    // Used at least 10 times
        .order('performance_score', { ascending: false })
        .limit(10);

      if (!topTemplates || topTemplates.length === 0) {
        return [];
      }

      const evolutions: TemplateEvolution[] = [];

      for (const template of topTemplates) {
        // Analyze what makes this template successful
        const successFactors = await this.analyzeTemplateSuccessFactors(template);
        
        // Generate evolved version
        const evolvedTemplate = await this.generateEvolvedTemplate(template, successFactors);
        
        if (evolvedTemplate) {
          const evolution: TemplateEvolution = {
            originalTemplate: template.template_content,
            evolvedTemplate: evolvedTemplate.content,
            improvementScore: evolvedTemplate.expectedImprovement,
            testingSample: 0,
            confidence: evolvedTemplate.confidence,
            successMetrics: {
              responseRate: template.response_rate || 0,
              engagementRate: 0,
              conversionRate: template.conversion_rate || 0
            },
            evolutionReason: evolvedTemplate.reason
          };

          evolutions.push(evolution);

          // Create A/B test variant
          await this.createABTestVariant(evolution);
        }
      }

      console.log(`🧬 [LEARNING ENGINE] Generated ${evolutions.length} template evolutions`);
      return evolutions;

    } catch (error) {
      console.error('❌ [LEARNING ENGINE] Error evolving templates:', error);
      return [];
    }
  }

  async recognizeConversationPatterns(): Promise<ConversationPattern[]> {
    console.log('🔍 [LEARNING ENGINE] Analyzing conversation patterns...');

    try {
      // Get recent successful conversations
      const { data: successfulOutcomes } = await supabase
        .from('ai_learning_outcomes')
        .select(`
          *,
          conversations!inner(*)
        `)
        .in('outcome_type', ['conversion', 'appointment_booked', 'positive_response'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      if (!successfulOutcomes) {
        return [];
      }

      // Group by conversation flow patterns
      const patternGroups = this.groupConversationsByPattern(successfulOutcomes);
      
      const recognizedPatterns: ConversationPattern[] = [];

      for (const [patternType, conversations] of patternGroups.entries()) {
        if (conversations.length >= 3) { // Need at least 3 examples
          const pattern = await this.analyzePatternCharacteristics(patternType, conversations);
          recognizedPatterns.push(pattern);
          
          // Store pattern for future use
          this.conversationPatterns.set(pattern.patternId, pattern);
        }
      }

      // Store patterns in database
      await this.storeConversationPatterns(recognizedPatterns);

      console.log(`🔍 [LEARNING ENGINE] Recognized ${recognizedPatterns.length} conversation patterns`);
      return recognizedPatterns;

    } catch (error) {
      console.error('❌ [LEARNING ENGINE] Error recognizing patterns:', error);
      return [];
    }
  }

  async predictConversationOutcome(leadId: string, conversationHistory: any[] = []): Promise<PredictedOutcome> {
    console.log('🔮 [LEARNING ENGINE] Predicting conversation outcome for:', leadId);

    try {
      // Get conversation context
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })
        .limit(20);

      const fullHistory = conversations || conversationHistory;

      // Analyze conversation trajectory
      const trajectory = this.analyzeConversationTrajectory(fullHistory);
      
      // Match against known patterns
      const matchedPattern = this.findBestMatchingPattern(trajectory);
      
      // Calculate prediction based on multiple factors
      const prediction = await this.calculateOutcomePrediction(
        leadId,
        trajectory,
        matchedPattern
      );

      console.log('🔮 [LEARNING ENGINE] Prediction generated:', {
        outcome: prediction.predictedOutcome,
        confidence: prediction.confidence
      });

      return prediction;

    } catch (error) {
      console.error('❌ [LEARNING ENGINE] Error predicting outcome:', error);
      return this.getFallbackPrediction(leadId);
    }
  }

  async optimizeMessagingStrategy(leadId: string): Promise<{
    recommendedTemplate: string;
    timing: Date;
    personalizationFactors: string[];
    expectedOutcome: PredictedOutcome;
    riskAssessment: string;
  }> {
    console.log('🎯 [LEARNING ENGINE] Optimizing messaging strategy for:', leadId);

    try {
      // Get lead's interaction history and patterns
      const leadHistory = await this.getLeadLearningHistory(leadId);
      
      // Predict conversation outcome
      const outcomePredicton = await this.predictConversationOutcome(leadId);
      
      // Find best performing template for this lead type
      const bestTemplate = await this.findOptimalTemplateForLead(leadId, leadHistory);
      
      // Calculate optimal timing
      const optimalTiming = await predictiveSchedulingEngine.calculateOptimalSendTime(leadId);
      
      // Generate personalization factors
      const personalizationFactors = this.extractPersonalizationFactors(leadHistory);
      
      // Assess risks
      const riskAssessment = this.assessMessagingRisk(leadHistory, outcomePredicton);

      return {
        recommendedTemplate: bestTemplate,
        timing: optimalTiming?.optimalDateTime || new Date(Date.now() + 2 * 60 * 60 * 1000),
        personalizationFactors,
        expectedOutcome: outcomePredicton,
        riskAssessment
      };

    } catch (error) {
      console.error('❌ [LEARNING ENGINE] Error optimizing strategy:', error);
      throw error;
    }
  }

  private async getMessageContext(messageId: string): Promise<any> {
    const { data: message } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', messageId)
      .single();

    return {
      templateHash: message ? this.generateTemplateHash(message.body) : null,
      messageLength: message?.body?.length || 0,
      hasPersonalization: message?.body?.includes('{') || false,
      messageType: message?.ai_generated ? 'ai_generated' : 'human_written'
    };
  }

  private async getLeadContext(leadId: string): Promise<any> {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    return {
      leadAge: lead ? Date.now() - new Date(lead.created_at).getTime() : 0,
      source: lead?.source,
      vehicleInterest: lead?.vehicle_interest,
      aiStage: lead?.ai_stage,
      lastReplyTime: lead?.last_reply_at
    };
  }

  private async storeLearningEvent(event: LearningEvent): Promise<void> {
    try {
      await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: event.leadId,
          message_id: event.messageId,
          outcome_type: event.eventType,
          outcome_value: event.outcomeMetrics.engagementScore || 0,
          message_characteristics: event.contextFactors.messageCharacteristics,
          lead_characteristics: event.contextFactors.leadCharacteristics,
          success_factors: event.eventData
        });
    } catch (error) {
      console.error('Failed to store learning event:', error);
    }
  }

  private async processLearningEvent(event: LearningEvent): Promise<void> {
    // Real-time learning processing
    if (event.eventType === 'response_received' && event.outcomeMetrics.engagementScore && event.outcomeMetrics.engagementScore > 80) {
      // High engagement - reinforce this pattern
      await this.reinforceSuccessPattern(event);
    } else if (event.eventType === 'no_response') {
      // No response - analyze why and adjust
      await this.analyzeFailurePattern(event);
    }
  }

  private async analyzeTemplateSuccessFactors(template: any): Promise<string[]> {
    // Analyze what makes this template successful
    const factors: string[] = [];
    
    if (template.response_rate > 0.6) factors.push('high_response_rate');
    if (template.template_content.includes('?')) factors.push('includes_question');
    if (template.template_content.length < 100) factors.push('concise_message');
    if (template.template_content.toLowerCase().includes('thank')) factors.push('shows_gratitude');
    
    return factors;
  }

  private async generateEvolvedTemplate(
    originalTemplate: any,
    successFactors: string[]
  ): Promise<{ content: string; expectedImprovement: number; confidence: number; reason: string } | null> {
    // Simple template evolution logic - could be enhanced with AI/ML
    const original = originalTemplate.template_content;
    let evolved = original;
    let improvements = 0;
    const reasons: string[] = [];

    // Apply improvements based on success factors
    if (successFactors.includes('high_response_rate') && !original.includes('?')) {
      evolved += ' What are your thoughts on this?';
      improvements += 10;
      reasons.push('Added engagement question');
    }

    if (successFactors.includes('concise_message') && original.length > 150) {
      // Simplify message (basic approach)
      evolved = evolved.substring(0, 100) + '...';
      improvements += 5;
      reasons.push('Made more concise');
    }

    if (!successFactors.includes('shows_gratitude') && !original.toLowerCase().includes('thank')) {
      evolved = 'Thank you for your interest! ' + evolved;
      improvements += 8;
      reasons.push('Added gratitude expression');
    }

    if (improvements > 0) {
      return {
        content: evolved,
        expectedImprovement: improvements,
        confidence: Math.min(85, 50 + improvements * 2),
        reason: reasons.join(', ')
      };
    }

    return null;
  }

  private async createABTestVariant(evolution: TemplateEvolution): Promise<void> {
    try {
      await supabase
        .from('ai_template_variants')
        .insert({
          variant_name: `evolved_${Date.now()}`,
          variant_content: evolution.evolvedTemplate,
          variant_type: 'evolution_test',
          is_active: true
        });
    } catch (error) {
      console.error('Failed to create A/B test variant:', error);
    }
  }

  private groupConversationsByPattern(outcomes: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    outcomes.forEach(outcome => {
      let patternType = 'general';
      
      if (outcome.outcome_type === 'appointment_booked') {
        patternType = 'successful_conversion';
      } else if (outcome.days_to_outcome && outcome.days_to_outcome < 1) {
        patternType = 'quick_engagement';
      } else if (outcome.outcome_type === 'positive_response') {
        patternType = 're_engagement';
      }
      
      if (!groups.has(patternType)) {
        groups.set(patternType, []);
      }
      groups.get(patternType)!.push(outcome);
    });
    
    return groups;
  }

  private async analyzePatternCharacteristics(patternType: string, conversations: any[]): Promise<ConversationPattern> {
    const avgTimeToOutcome = conversations.reduce((sum, conv) => sum + (conv.days_to_outcome || 0), 0) / conversations.length;
    const successRate = conversations.length > 0 ? (conversations.filter(c => c.outcome_type !== 'negative_response').length / conversations.length) * 100 : 0;

    return {
      patternId: crypto.randomUUID(),
      patternType: patternType as any,
      triggerConditions: this.extractTriggerConditions(conversations),
      successRate,
      averageTimeToOutcome: avgTimeToOutcome,
      recommendedActions: this.generateRecommendedActions(patternType, conversations),
      contextFactors: this.extractContextFactors(conversations)
    };
  }

  private extractTriggerConditions(conversations: any[]): string[] {
    // Extract common triggers from successful conversations
    const conditions: string[] = [];
    
    const commonFactors = conversations.reduce((acc, conv) => {
      if (conv.lead_characteristics?.source) {
        acc.sources = acc.sources || {};
        acc.sources[conv.lead_characteristics.source] = (acc.sources[conv.lead_characteristics.source] || 0) + 1;
      }
      return acc;
    }, {});

    return ['lead_engaged', 'timing_optimal'];
  }

  private generateRecommendedActions(patternType: string, conversations: any[]): string[] {
    const actions: string[] = [];
    
    switch (patternType) {
      case 'successful_conversion':
        actions.push('schedule_follow_up', 'send_appointment_confirmation');
        break;
      case 'quick_engagement':
        actions.push('maintain_momentum', 'provide_detailed_info');
        break;
      case 're_engagement':
        actions.push('nurture_relationship', 'provide_value');
        break;
    }
    
    return actions;
  }

  private extractContextFactors(conversations: any[]): any {
    return {
      commonSources: conversations.map(c => c.lead_characteristics?.source).filter(Boolean),
      avgLeadAge: conversations.reduce((sum, c) => sum + (c.lead_characteristics?.leadAge || 0), 0) / conversations.length,
      commonVehicleInterests: conversations.map(c => c.lead_characteristics?.vehicleInterest).filter(Boolean)
    };
  }

  private async storeConversationPatterns(patterns: ConversationPattern[]): Promise<void> {
    for (const pattern of patterns) {
      try {
        await supabase
          .from('ai_learning_insights')
          .insert({
            insight_type: 'conversation_pattern',
            insight_title: `Conversation Pattern: ${pattern.patternType}`,
            insight_description: `Pattern with ${pattern.successRate.toFixed(1)}% success rate`,
            confidence_score: pattern.successRate,
            actionable: true,
            insight_data: {
              patternId: pattern.patternId,
              triggerConditions: pattern.triggerConditions,
              recommendedActions: pattern.recommendedActions,
              contextFactors: pattern.contextFactors
            }
          });
      } catch (error) {
        console.error('Failed to store conversation pattern:', error);
      }
    }
  }

  private analyzeConversationTrajectory(conversations: any[]): any {
    if (!conversations || conversations.length === 0) {
      return { trend: 'no_data', engagement: 0, momentum: 'neutral' };
    }

    const recentMessages = conversations.slice(-5);
    const customerMessages = recentMessages.filter(msg => msg.direction === 'in');
    const responseRate = customerMessages.length / recentMessages.filter(msg => msg.direction === 'out').length;

    return {
      trend: responseRate > 0.5 ? 'positive' : responseRate > 0.2 ? 'neutral' : 'declining',
      engagement: responseRate * 100,
      momentum: this.calculateMomentum(conversations),
      lastInteractionTime: conversations[conversations.length - 1]?.sent_at
    };
  }

  private calculateMomentum(conversations: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (conversations.length < 4) return 'stable';
    
    const recent = conversations.slice(-4);
    const older = conversations.slice(-8, -4);
    
    const recentCustomerMsgs = recent.filter(msg => msg.direction === 'in').length;
    const olderCustomerMsgs = older.filter(msg => msg.direction === 'in').length;
    
    if (recentCustomerMsgs > olderCustomerMsgs) return 'increasing';
    if (recentCustomerMsgs < olderCustomerMsgs) return 'decreasing';
    return 'stable';
  }

  private findBestMatchingPattern(trajectory: any): ConversationPattern | null {
    // Find best matching pattern from stored patterns
    for (const pattern of this.conversationPatterns.values()) {
      if (this.patternMatches(pattern, trajectory)) {
        return pattern;
      }
    }
    return null;
  }

  private patternMatches(pattern: ConversationPattern, trajectory: any): boolean {
    // Simple pattern matching logic
    if (pattern.patternType === 'successful_conversion' && trajectory.engagement > 70) {
      return true;
    }
    if (pattern.patternType === 're_engagement' && trajectory.momentum === 'increasing') {
      return true;
    }
    return false;
  }

  private async calculateOutcomePrediction(
    leadId: string,
    trajectory: any,
    matchedPattern: ConversationPattern | null
  ): Promise<PredictedOutcome> {
    let predictedOutcome: PredictedOutcome['predictedOutcome'] = 'continued_engagement';
    let confidence = 50;
    const contributingFactors: string[] = [];
    const recommendedActions: string[] = [];
    const riskFactors: string[] = [];

    // Base prediction on trajectory
    if (trajectory.engagement > 70) {
      predictedOutcome = 'conversion';
      confidence += 20;
      contributingFactors.push('High engagement level');
    } else if (trajectory.engagement < 20) {
      predictedOutcome = 'disengagement';
      confidence += 15;
      riskFactors.push('Low engagement trend');
    }

    // Enhance with pattern matching
    if (matchedPattern) {
      confidence += 10;
      contributingFactors.push(`Matches ${matchedPattern.patternType} pattern`);
      recommendedActions.push(...matchedPattern.recommendedActions);
    }

    // Time factor
    const hoursSinceLastInteraction = trajectory.lastInteractionTime 
      ? (Date.now() - new Date(trajectory.lastInteractionTime).getTime()) / (1000 * 60 * 60)
      : 24;

    if (hoursSinceLastInteraction > 72) {
      riskFactors.push('Extended silence period');
      if (predictedOutcome === 'continued_engagement') {
        predictedOutcome = 'escalation_needed';
      }
    }

    return {
      leadId,
      predictedOutcome,
      confidence: Math.min(95, confidence),
      timeToOutcome: matchedPattern?.averageTimeToOutcome || 3, // days
      contributingFactors,
      recommendedActions,
      riskFactors
    };
  }

  private getFallbackPrediction(leadId: string): PredictedOutcome {
    return {
      leadId,
      predictedOutcome: 'continued_engagement',
      confidence: 30,
      timeToOutcome: 5,
      contributingFactors: ['Insufficient data for accurate prediction'],
      recommendedActions: ['Monitor engagement closely'],
      riskFactors: ['Limited historical data']
    };
  }

  // Additional helper methods
  private generateTemplateHash(content: string): string {
    return btoa(content.substring(0, 50)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  }

  private async reinforceSuccessPattern(event: LearningEvent): Promise<void> {
    // Store successful patterns for reinforcement learning
    try {
      await supabase
        .from('ai_learning_insights')
        .insert({
          insight_type: 'success_pattern',
          insight_title: 'High Engagement Response',
          insight_description: `Template achieved ${event.outcomeMetrics.engagementScore}% engagement`,
          confidence_score: event.outcomeMetrics.engagementScore || 0,
          actionable: true,
          insight_data: JSON.parse(JSON.stringify(event))
        });
    } catch (error) {
      console.error('Failed to reinforce success pattern:', error);
    }
  }

  private async analyzeFailurePattern(event: LearningEvent): Promise<void> {
    // Analyze why message failed to get response
    const factors = [];
    
    if (event.contextFactors.messageCharacteristics?.messageLength > 150) {
      factors.push('message_too_long');
    }
    
    const hoursSinceLastMessage = event.contextFactors.leadCharacteristics?.lastReplyTime
      ? (Date.now() - new Date(event.contextFactors.leadCharacteristics.lastReplyTime).getTime()) / (1000 * 60 * 60)
      : 0;
      
    if (hoursSinceLastMessage < 2) {
      factors.push('sent_too_soon');
    }

    // Store failure analysis
    try {
      await supabase
        .from('ai_learning_insights')
        .insert({
          insight_type: 'failure_pattern',
          insight_title: 'No Response Analysis',
          insight_description: `Factors: ${factors.join(', ')}`,
          confidence_score: 70,
          actionable: true,
          insight_data: { eventData: JSON.parse(JSON.stringify(event)), failureFactors: factors }
        });
    } catch (error) {
      console.error('Failed to analyze failure pattern:', error);
    }
  }

  private async getLeadLearningHistory(leadId: string): Promise<any> {
    const { data: history } = await supabase
      .from('ai_learning_outcomes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);

    return history || [];
  }

  private async findOptimalTemplateForLead(leadId: string, history: any[]): Promise<string> {
    // Find best performing template for this lead type
    const { data: bestTemplate } = await supabase
      .from('ai_template_performance')
      .select('template_content')
      .order('performance_score', { ascending: false })
      .limit(1)
      .single();

    return bestTemplate?.template_content || 'Hi {name}, I wanted to follow up on your interest in {vehicle}. Would you like to schedule a time to discuss this further?';
  }

  private extractPersonalizationFactors(history: any[]): string[] {
    const factors: string[] = [];
    
    if (history.some(h => h.outcome_type === 'positive_response')) {
      factors.push('responds_well_to_questions');
    }
    
    if (history.some(h => h.message_characteristics?.hasPersonalization)) {
      factors.push('engages_with_personalized_content');
    }
    
    return factors;
  }

  private assessMessagingRisk(history: any[], prediction: PredictedOutcome): string {
    const riskFactors = prediction.riskFactors.length;
    const failureRate = history.filter(h => h.outcome_type === 'no_response').length / Math.max(1, history.length);
    
    if (riskFactors > 2 || failureRate > 0.7) return 'high';
    if (riskFactors > 0 || failureRate > 0.4) return 'medium';
    return 'low';
  }

  // Public interface methods
  async runLearningCycle(): Promise<void> {
    if (this.isLearning) return;
    
    this.isLearning = true;
    console.log('🧠 [LEARNING ENGINE] Running learning cycle...');

    try {
      // Process all three learning phases
      await Promise.all([
        this.evolveBestPerformingTemplates(),
        this.recognizeConversationPatterns()
      ]);

      console.log('✅ [LEARNING ENGINE] Learning cycle complete');
    } catch (error) {
      console.error('❌ [LEARNING ENGINE] Learning cycle failed:', error);
    } finally {
      this.isLearning = false;
    }
  }

  clearCache(): void {
    this.learningEvents.clear();
    this.conversationPatterns.clear();
    this.templateEvolutions.clear();
  }
}

export const adaptiveLearningEngine = AdaptiveLearningEngine.getInstance();