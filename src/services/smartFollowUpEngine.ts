import { supabase } from '@/integrations/supabase/client';
import { contextualAIAssistant, type AIRecommendation, type ContextualInsights } from './contextualAIAssistant';
import { processConversationForAI } from './conversationAnalysis/enhancedConversationProcessor';
import { customerJourneyTracker } from './finnAI/customerJourneyTracker';

export interface SmartRecommendation extends AIRecommendation {
  contextFactors: string[];
  expectedOutcome: string;
  timeToExecute: number; // minutes
  relatedActions: string[];
  successProbability: number;
}

export interface FollowUpContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  conversationHistory: string[];
  lastInteractionDate: Date;
  leadTemperature: number;
  journeyStage: string;
  previousActions: string[];
  engagementPattern: 'responsive' | 'slow' | 'inactive';
}

class SmartFollowUpEngine {
  async generateContextualRecommendations(
    context: FollowUpContext
  ): Promise<SmartRecommendation[]> {
    console.log('🧠 Generating contextual follow-up recommendations for:', context.leadId);

    try {
      // 1. Analyze current conversation state
      const conversationAnalysis = processConversationForAI(
        context.conversationHistory.join('\n'),
        context.conversationHistory[context.conversationHistory.length - 1] || '',
        context.leadId
      );

      // 2. Get AI contextual insights
      const aiInsights = await contextualAIAssistant.analyzeConversationContext(
        context.leadId,
        context.conversationHistory.join('\n'),
        context.conversationHistory[context.conversationHistory.length - 1] || ''
      );

      // 3. Generate timeline-aware recommendations
      const timeBasedActions = this.generateTimeBasedRecommendations(context);

      // 4. Generate engagement-specific recommendations
      const engagementActions = this.generateEngagementRecommendations(context, conversationAnalysis);

      // 5. Generate journey-stage recommendations
      const journeyActions = this.generateJourneyStageRecommendations(context, aiInsights);

      // 6. Combine and prioritize all recommendations
      const allRecommendations = [
        ...timeBasedActions,
        ...engagementActions,
        ...journeyActions,
        ...this.enhanceBaseRecommendations(aiInsights.nextBestActions, context)
      ];

      // 7. Remove duplicates and rank by priority
      const uniqueRecommendations = this.deduplicateAndRank(allRecommendations);

      // 8. Store recommendations for learning
      await this.storeRecommendations(context.leadId, uniqueRecommendations);

      console.log(`✅ Generated ${uniqueRecommendations.length} smart recommendations`);
      return uniqueRecommendations.slice(0, 5); // Return top 5

    } catch (error) {
      console.error('❌ Error generating contextual recommendations:', error);
      return [];
    }
  }

  async executeRecommendation(
    leadId: string, 
    recommendation: SmartRecommendation
  ): Promise<boolean> {
    try {
      console.log('🚀 Executing recommendation:', recommendation.action);

      // Track the action execution
      await customerJourneyTracker.trackTouchpoint(
        leadId,
        'ai_analysis',
        'system',
        {
          action: recommendation.action,
          recommendation_id: recommendation.id,
          confidence: recommendation.confidence,
          auto_executed: recommendation.automatable
        },
        'neutral'
      );

      // Execute based on recommendation type
      switch (recommendation.type) {
        case 'immediate':
          return await this.executeImmediateAction(leadId, recommendation);
        case 'scheduled':
          return await this.scheduleAction(leadId, recommendation);
        case 'reminder':
          return await this.createReminder(leadId, recommendation);
        default:
          return false;
      }

    } catch (error) {
      console.error('❌ Error executing recommendation:', error);
      return false;
    }
  }

  private generateTimeBasedRecommendations(context: FollowUpContext): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const daysSinceLastContact = Math.floor(
      (Date.now() - context.lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastContact === 0) {
      recommendations.push({
        id: 'immediate_response',
        action: 'Send immediate personalized response',
        type: 'immediate',
        priority: 'high',
        confidence: 0.9,
        reasoning: 'Customer just engaged - strike while iron is hot',
        automatable: true,
        contextFactors: ['Fresh engagement', 'Same-day interaction'],
        expectedOutcome: 'Maintain engagement momentum',
        timeToExecute: 5,
        relatedActions: ['Follow-up questions', 'Value proposition'],
        successProbability: 0.85
      });
    } else if (daysSinceLastContact === 1) {
      recommendations.push({
        id: 'next_day_followup',
        action: 'Send thoughtful follow-up with additional value',
        type: 'immediate',
        priority: 'medium',
        confidence: 0.75,
        reasoning: 'One day is optimal for non-intrusive follow-up',
        automatable: true,
        contextFactors: ['24-hour window', 'Relationship building'],
        expectedOutcome: 'Re-engage and provide value',
        timeToExecute: 10,
        relatedActions: ['Vehicle details', 'Financing options'],
        successProbability: 0.7
      });
    } else if (daysSinceLastContact >= 3 && daysSinceLastContact <= 7) {
      recommendations.push({
        id: 'value_based_reengagement',
        action: 'Send value-based re-engagement message',
        type: 'immediate',
        priority: context.leadTemperature > 60 ? 'high' : 'medium',
        confidence: 0.65,
        reasoning: 'Customer needs gentle re-engagement with value proposition',
        automatable: true,
        contextFactors: ['Mid-term follow-up', 'Value-focused'],
        expectedOutcome: 'Rekindle interest with new information',
        timeToExecute: 15,
        relatedActions: ['Market updates', 'New inventory'],
        successProbability: 0.6
      });
    }

    return recommendations;
  }

  private generateEngagementRecommendations(
    context: FollowUpContext,
    analysis: any
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    switch (context.engagementPattern) {
      case 'responsive':
        recommendations.push({
          id: 'acceleration_strategy',
          action: 'Accelerate sales process with direct call-to-action',
          type: 'immediate',
          priority: 'high',
          confidence: 0.8,
          reasoning: 'Customer is highly responsive - time to close',
          automatable: false,
          contextFactors: ['High responsiveness', 'Engagement momentum'],
          expectedOutcome: 'Move to next sales stage',
          timeToExecute: 20,
          relatedActions: ['Schedule appointment', 'Prepare offer'],
          successProbability: 0.75
        });
        break;

      case 'slow':
        recommendations.push({
          id: 'patience_strategy',
          action: 'Send low-pressure educational content',
          type: 'scheduled',
          priority: 'medium',
          confidence: 0.6,
          reasoning: 'Customer needs time - provide value without pressure',
          automatable: true,
          contextFactors: ['Slow response pattern', 'Educational approach'],
          expectedOutcome: 'Build trust and familiarity',
          timeToExecute: 10,
          relatedActions: ['Market insights', 'Vehicle comparisons'],
          successProbability: 0.55
        });
        break;

      case 'inactive':
        recommendations.push({
          id: 'reactivation_strategy',
          action: 'Send compelling reactivation campaign',
          type: 'immediate',
          priority: 'low',
          confidence: 0.4,
          reasoning: 'Customer is inactive - needs strong value proposition',
          automatable: true,
          contextFactors: ['Inactive pattern', 'Reactivation needed'],
          expectedOutcome: 'Rekindle any remaining interest',
          timeToExecute: 15,
          relatedActions: ['Special offers', 'Limited time deals'],
          successProbability: 0.3
        });
        break;
    }

    return recommendations;
  }

  private generateJourneyStageRecommendations(
    context: FollowUpContext,
    insights: ContextualInsights
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    switch (insights.conversationStage) {
      case 'initial_contact':
        recommendations.push({
          id: 'discovery_questions',
          action: 'Ask targeted discovery questions about needs',
          type: 'immediate',
          priority: 'medium',
          confidence: 0.7,
          reasoning: 'Need to understand customer requirements better',
          automatable: true,
          contextFactors: ['Early stage', 'Discovery needed'],
          expectedOutcome: 'Better understanding of customer needs',
          timeToExecute: 5,
          relatedActions: ['Needs assessment', 'Preference mapping'],
          successProbability: 0.8
        });
        break;

      case 'interest_building':
        recommendations.push({
          id: 'showcase_benefits',
          action: 'Showcase specific vehicle benefits matching their needs',
          type: 'immediate',
          priority: 'high',
          confidence: 0.85,
          reasoning: 'Customer is interested - now show value alignment',
          automatable: true,
          contextFactors: ['Interest confirmed', 'Value demonstration'],
          expectedOutcome: 'Strengthen desire and move toward decision',
          timeToExecute: 15,
          relatedActions: ['Feature highlights', 'Benefit matching'],
          successProbability: 0.8
        });
        break;

      case 'decision':
        recommendations.push({
          id: 'decision_support',
          action: 'Provide decision-support materials and urgency',
          type: 'immediate',
          priority: 'critical',
          confidence: 0.9,
          reasoning: 'Customer is in decision phase - critical moment',
          automatable: false,
          contextFactors: ['Decision stage', 'Critical timing'],
          expectedOutcome: 'Guide toward positive purchase decision',
          timeToExecute: 30,
          relatedActions: ['Comparison charts', 'Financing options'],
          successProbability: 0.85
        });
        break;
    }

    return recommendations;
  }

  private enhanceBaseRecommendations(
    baseRecommendations: AIRecommendation[],
    context: FollowUpContext
  ): SmartRecommendation[] {
    return baseRecommendations.map(rec => ({
      ...rec,
      contextFactors: this.extractContextFactors(context),
      expectedOutcome: this.determineExpectedOutcome(rec.action),
      timeToExecute: this.estimateExecutionTime(rec.action),
      relatedActions: this.findRelatedActions(rec.action),
      successProbability: this.calculateSuccessProbability(rec, context)
    }));
  }

  private extractContextFactors(context: FollowUpContext): string[] {
    const factors: string[] = [];
    
    if (context.leadTemperature > 70) factors.push('High engagement');
    if (context.conversationHistory.length > 5) factors.push('Established dialogue');
    if (context.vehicleInterest.includes('specific')) factors.push('Specific interest');
    
    return factors;
  }

  private determineExpectedOutcome(action: string): string {
    const outcomeMap: Record<string, string> = {
      'schedule': 'Confirmed appointment',
      'provide': 'Increased engagement',
      'send': 'Continued conversation',
      'address': 'Resolved concerns',
      'present': 'Clear next steps'
    };

    const key = Object.keys(outcomeMap).find(k => action.toLowerCase().includes(k));
    return key ? outcomeMap[key] : 'Positive response';
  }

  private estimateExecutionTime(action: string): number {
    if (action.includes('call') || action.includes('phone')) return 20;
    if (action.includes('meeting') || action.includes('appointment')) return 30;
    if (action.includes('email') || action.includes('message')) return 5;
    return 10;
  }

  private findRelatedActions(action: string): string[] {
    const relatedMap: Record<string, string[]> = {
      'schedule': ['Confirm details', 'Send reminder'],
      'provide': ['Follow up on questions', 'Check understanding'],
      'address': ['Provide alternatives', 'Offer reassurance']
    };

    const key = Object.keys(relatedMap).find(k => action.toLowerCase().includes(k));
    return key ? relatedMap[key] : [];
  }

  private calculateSuccessProbability(
    recommendation: AIRecommendation,
    context: FollowUpContext
  ): number {
    let probability = recommendation.confidence;
    
    // Adjust based on lead temperature
    if (context.leadTemperature > 70) probability += 0.1;
    if (context.leadTemperature < 30) probability -= 0.2;
    
    // Adjust based on engagement pattern
    if (context.engagementPattern === 'responsive') probability += 0.15;
    if (context.engagementPattern === 'inactive') probability -= 0.25;
    
    return Math.max(0.1, Math.min(0.95, probability));
  }

  private deduplicateAndRank(recommendations: SmartRecommendation[]): SmartRecommendation[] {
    // Remove duplicates based on action similarity
    const unique = recommendations.filter((rec, index, arr) => 
      arr.findIndex(r => r.action.toLowerCase() === rec.action.toLowerCase()) === index
    );

    // Sort by priority and confidence
    return unique.sort((a, b) => {
      const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityMap[a.priority];
      const bPriority = priorityMap[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });
  }

  private async executeImmediateAction(
    leadId: string,
    recommendation: SmartRecommendation
  ): Promise<boolean> {
    if (recommendation.automatable) {
      // Add to message approval queue for immediate sending
      await supabase
        .from('ai_message_approval_queue')
        .insert({
          lead_id: leadId,
          message_content: recommendation.action,
          urgency_level: recommendation.priority,
          scheduled_send_at: new Date().toISOString(),
          auto_approved: true
        });
      return true;
    }
    return false;
  }

  private async scheduleAction(
    leadId: string,
    recommendation: SmartRecommendation
  ): Promise<boolean> {
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 24); // Schedule for next day

    await supabase
      .from('ai_message_approval_queue')
      .insert({
        lead_id: leadId,
        message_content: recommendation.action,
        urgency_level: recommendation.priority,
        scheduled_send_at: scheduledTime.toISOString(),
        auto_approved: recommendation.automatable
      });
    return true;
  }

  private async createReminder(
    leadId: string,
    recommendation: SmartRecommendation
  ): Promise<boolean> {
    await supabase
      .from('ai_notifications')
      .insert({
        lead_id: leadId,
        notification_type: 'follow_up_reminder',
        title: 'Follow-up Reminder',
        message: recommendation.action,
        urgency_level: recommendation.priority,
        ai_confidence: recommendation.confidence
      });
    return true;
  }

  private async storeRecommendations(
    leadId: string,
    recommendations: SmartRecommendation[]
  ): Promise<void> {
    // Store for learning and analytics
    const records = recommendations.map(rec => ({
      lead_id: leadId,
      recommendation_data: JSON.stringify(rec),
      confidence_score: rec.confidence,
      priority_level: rec.priority,
      expected_outcome: rec.expectedOutcome,
      success_probability: rec.successProbability
    }));

    // Note: This would require a new table, for now we'll log
    console.log('📊 Storing recommendations for learning:', records.length);
  }
}

export const smartFollowUpEngine = new SmartFollowUpEngine();