
import { processConversationForAI } from './conversationAnalysis/enhancedConversationProcessor';
import { calculateLeadScore } from './leadScoringService';
import { analyzeMessageSentiment } from './sentimentAnalysisService';
import { intentRecognitionService } from './intentRecognitionService';
import { supabase } from '@/integrations/supabase/client';

export interface AIRecommendation {
  id: string;
  type: 'immediate' | 'scheduled' | 'reminder' | 'escalation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reasoning: string;
  suggestedTiming?: string;
  automatable: boolean;
  confidence: number;
  expectedOutcome?: string;
}

export interface ContextualInsights {
  leadTemperature: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  nextBestActions: AIRecommendation[];
  followUpScheduling: {
    shouldSchedule: boolean;
    suggestedTime: string;
    reason: string;
  };
  conversationStage: string;
  riskFactors: string[];
  opportunities: string[];
}

export interface FollowUpSchedule {
  id: string;
  leadId: string;
  scheduledFor: Date;
  type: 'soft_touch' | 'aggressive_follow' | 'check_in' | 'closing_attempt';
  message: string;
  priority: number;
  automated: boolean;
  conditions?: string[];
}

class ContextualAIAssistant {
  async analyzeConversationContext(
    leadId: string,
    conversationHistory: string,
    latestMessage: string
  ): Promise<ContextualInsights> {
    console.log('🤖 Analyzing conversation context for AI assistance');

    try {
      // Get comprehensive conversation analysis
      const analysis = processConversationForAI(conversationHistory, latestMessage, leadId);
      
      // Get lead scoring data
      const leadScore = await calculateLeadScore(leadId);
      
      // Analyze sentiment and intent
      const sentiment = await analyzeMessageSentiment(leadId, latestMessage);
      const intent = intentRecognitionService.analyzeIntent(latestMessage, conversationHistory);

      // Generate contextual recommendations
      const recommendations = this.generateSmartRecommendations(analysis, leadScore, sentiment, intent);
      
      // Determine follow-up scheduling
      const followUpScheduling = this.determineFollowUpScheduling(analysis, leadScore, recommendations);

      // Identify risks and opportunities
      const riskFactors = this.identifyRiskFactors(analysis, leadScore, sentiment);
      const opportunities = this.identifyOpportunities(analysis, leadScore, intent);

      return {
        leadTemperature: analysis.leadTemperature,
        urgencyLevel: intent.overallUrgency,
        nextBestActions: recommendations,
        followUpScheduling,
        conversationStage: analysis.conversationStage,
        riskFactors,
        opportunities
      };
    } catch (error) {
      console.error('❌ Error analyzing conversation context:', error);
      throw error;
    }
  }

  private generateSmartRecommendations(
    analysis: any,
    leadScore: any,
    sentiment: any,
    intent: any
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Critical buying signals
    if (analysis.buyingSignals.some((s: any) => s.type === 'ready_to_buy')) {
      recommendations.push({
        id: 'immediate_close',
        type: 'immediate',
        priority: 'critical',
        action: 'Schedule immediate appointment or begin closing process',
        reasoning: 'Strong buying signals detected - customer appears ready to purchase',
        automatable: false,
        confidence: 0.9,
        expectedOutcome: 'High probability of closing within 24-48 hours'
      });
    }

    // High churn risk
    if (leadScore && leadScore.churnProbability > 70) {
      recommendations.push({
        id: 'churn_prevention',
        type: 'immediate',
        priority: 'high',
        action: 'Personal call from senior sales representative',
        reasoning: `High churn risk detected (${leadScore.churnProbability}%)`,
        automatable: false,
        confidence: 0.8,
        expectedOutcome: 'Prevent lead from going cold'
      });
    }

    // Objection handling
    if (analysis.buyingSignals.some((s: any) => s.type === 'objection')) {
      recommendations.push({
        id: 'objection_response',
        type: 'immediate',
        priority: 'high',
        action: 'Address objections with tailored responses and value proposition',
        reasoning: 'Customer objections need immediate attention',
        automatable: true,
        confidence: 0.7,
        expectedOutcome: 'Overcome objections and move to next stage'
      });
    }

    // Information requests
    if (intent.primaryIntent.type === 'information_request') {
      recommendations.push({
        id: 'provide_info',
        type: 'immediate',
        priority: 'medium',
        action: 'Send detailed vehicle information and schedule demonstration',
        reasoning: 'Customer is actively seeking information',
        automatable: true,
        confidence: 0.8,
        expectedOutcome: 'Increased engagement and movement toward purchase'
      });
    }

    // Pricing inquiries
    if (intent.primaryIntent.type === 'pricing_inquiry') {
      recommendations.push({
        id: 'pricing_discussion',
        type: 'immediate',
        priority: 'high',
        action: 'Provide transparent pricing with financing options',
        reasoning: 'Price discussion indicates serious buying consideration',
        automatable: true,
        confidence: 0.9,
        expectedOutcome: 'Move to financial qualification stage'
      });
    }

    // Low engagement follow-up
    if (analysis.leadTemperature < 40) {
      recommendations.push({
        id: 'engagement_boost',
        type: 'scheduled',
        priority: 'medium',
        action: 'Send engaging content or special offer',
        reasoning: 'Low engagement score requires re-activation strategy',
        suggestedTiming: '24 hours',
        automatable: true,
        confidence: 0.6,
        expectedOutcome: 'Increased engagement and renewed interest'
      });
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private determineFollowUpScheduling(
    analysis: any,
    leadScore: any,
    recommendations: AIRecommendation[]
  ) {
    // High urgency situations
    if (recommendations.some(r => r.priority === 'critical')) {
      return {
        shouldSchedule: true,
        suggestedTime: '2 hours',
        reason: 'Critical buying signals require immediate follow-up'
      };
    }

    // High temperature leads
    if (analysis.leadTemperature > 70) {
      return {
        shouldSchedule: true,
        suggestedTime: '4 hours',
        reason: 'Hot lead requires quick follow-up to maintain momentum'
      };
    }

    // Objection handling
    if (analysis.conversationStage === 'objection_handling') {
      return {
        shouldSchedule: true,
        suggestedTime: '6 hours',
        reason: 'Objections need timely resolution'
      };
    }

    // Standard follow-up
    if (analysis.leadTemperature > 40) {
      return {
        shouldSchedule: true,
        suggestedTime: '24 hours',
        reason: 'Maintain engagement with regular follow-up'
      };
    }

    // Low priority follow-up
    return {
      shouldSchedule: true,
      suggestedTime: '3 days',
      reason: 'Standard nurturing follow-up'
    };
  }

  private identifyRiskFactors(analysis: any, leadScore: any, sentiment: any): string[] {
    const risks: string[] = [];

    if (leadScore?.churnProbability > 50) {
      risks.push('High churn probability detected');
    }

    if (sentiment?.sentimentScore < -0.3) {
      risks.push('Negative sentiment in recent messages');
    }

    if (analysis.leadTemperature < 30) {
      risks.push('Very low engagement level');
    }

    if (analysis.buyingSignals.some((s: any) => s.type === 'objection')) {
      risks.push('Unresolved customer objections');
    }

    return risks;
  }

  private identifyOpportunities(analysis: any, leadScore: any, intent: any): string[] {
    const opportunities: string[] = [];

    if (analysis.leadTemperature > 70) {
      opportunities.push('High engagement - excellent closing opportunity');
    }

    if (intent.primaryIntent.type === 'buying_signal') {
      opportunities.push('Strong buying intent detected');
    }

    if (analysis.vehicleInterest.confidence > 0.8) {
      opportunities.push('Clear vehicle preference identified');
    }

    if (analysis.buyingSignals.some((s: any) => s.urgencyLevel === 'immediate')) {
      opportunities.push('Time-sensitive buying opportunity');
    }

    return opportunities;
  }

  async scheduleAutomatedFollowUp(
    leadId: string,
    recommendation: AIRecommendation,
    insights: ContextualInsights
  ): Promise<FollowUpSchedule | null> {
    if (!recommendation.automatable || !insights.followUpScheduling.shouldSchedule) {
      return null;
    }

    try {
      const scheduledTime = new Date();
      const hours = this.parseTimeToHours(insights.followUpScheduling.suggestedTime);
      scheduledTime.setHours(scheduledTime.getHours() + hours);

      const followUp: FollowUpSchedule = {
        id: `followup_${Date.now()}`,
        leadId,
        scheduledFor: scheduledTime,
        type: this.determineFollowUpType(recommendation, insights),
        message: await this.generateFollowUpMessage(recommendation, insights),
        priority: this.mapPriorityToNumber(recommendation.priority),
        automated: true,
        conditions: this.generateFollowUpConditions(recommendation, insights)
      };

      // Store in database for scheduler
      await this.storeFollowUpSchedule(followUp);

      console.log('📅 Automated follow-up scheduled:', followUp);
      return followUp;
    } catch (error) {
      console.error('❌ Error scheduling follow-up:', error);
      return null;
    }
  }

  private parseTimeToHours(timeString: string): number {
    const match = timeString.match(/(\d+)\s*(hour|day)s?/);
    if (!match) return 24; // Default to 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    return unit === 'day' ? value * 24 : value;
  }

  private determineFollowUpType(
    recommendation: AIRecommendation,
    insights: ContextualInsights
  ): FollowUpSchedule['type'] {
    if (recommendation.priority === 'critical') return 'closing_attempt';
    if (insights.leadTemperature > 70) return 'aggressive_follow';
    if (insights.conversationStage === 'objection_handling') return 'soft_touch';
    return 'check_in';
  }

  private async generateFollowUpMessage(
    recommendation: AIRecommendation,
    insights: ContextualInsights
  ): Promise<string> {
    // This would typically use AI to generate contextual messages
    const templates = {
      closing_attempt: "Hi! I wanted to follow up on our conversation. Are you ready to move forward with the next steps?",
      aggressive_follow: "I hope you're still interested! I have some exciting updates that might interest you.",
      soft_touch: "Just checking in to see if you have any other questions I can help with.",
      check_in: "Hi! I wanted to touch base and see how you're doing with your vehicle search."
    };

    const type = this.determineFollowUpType(recommendation, insights);
    return templates[type];
  }

  private mapPriorityToNumber(priority: AIRecommendation['priority']): number {
    const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityMap[priority];
  }

  private generateFollowUpConditions(
    recommendation: AIRecommendation,
    insights: ContextualInsights
  ): string[] {
    const conditions: string[] = [];

    if (insights.leadTemperature < 30) {
      conditions.push('Only send if no customer response in last 48 hours');
    }

    if (recommendation.priority === 'critical') {
      conditions.push('Escalate to human if no response within 4 hours');
    }

    return conditions;
  }

  private async storeFollowUpSchedule(followUp: FollowUpSchedule): Promise<void> {
    // Store in ai_message_approval_queue for now
    await supabase
      .from('ai_message_approval_queue')
      .insert({
        lead_id: followUp.leadId,
        message_content: followUp.message,
        scheduled_send_at: followUp.scheduledFor.toISOString(),
        urgency_level: followUp.priority >= 3 ? 'high' : 'normal',
        auto_approved: followUp.automated
      });
  }
}

export const contextualAIAssistant = new ContextualAIAssistant();
