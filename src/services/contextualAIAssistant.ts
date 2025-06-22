import { processConversationForAI } from './conversationAnalysis/enhancedConversationProcessor';
import { calculateLeadScore } from './leadScoringService';
import { analyzeMessageSentiment } from './sentimentAnalysisService';
import { intentRecognitionService } from './intentRecognitionService';
import { enhancedFinnAI } from './finnAI/enhancedFinnAI';
import { enhancedContextEngine } from './finnAI/context/contextEngine';
import { customerJourneyTracker } from './finnAI/customerJourneyTracker';
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
    console.log('🤖 Enhanced AI analyzing conversation context with FinnAI integration');

    try {
      // Process message through enhanced FinnAI system
      const enhancedAIResponse = await enhancedFinnAI.processMessage({
        leadId,
        message: latestMessage,
        direction: 'in',
        context: { conversationHistory }
      });

      // Get comprehensive conversation analysis
      const analysis = processConversationForAI(conversationHistory, latestMessage, leadId);
      
      // Get lead scoring data
      const leadScore = await calculateLeadScore(leadId);
      
      // Analyze sentiment and intent
      const sentiment = await analyzeMessageSentiment(leadId, latestMessage);
      const intent = intentRecognitionService.analyzeIntent(latestMessage, conversationHistory);

      // Get contextual insights from FinnAI
      const contextInsights = await enhancedContextEngine.getContextualInsights(leadId);
      
      // Get customer journey insights
      const journeyInsights = await customerJourneyTracker.getJourneyInsights(leadId);

      // Generate smart recommendations with FinnAI integration
      const recommendations = this.generateEnhancedRecommendations(
        analysis, 
        leadScore, 
        sentiment, 
        intent,
        contextInsights,
        journeyInsights,
        enhancedAIResponse
      );
      
      // Determine follow-up scheduling with journey context
      const followUpScheduling = this.determineEnhancedFollowUpScheduling(
        analysis, 
        leadScore, 
        recommendations,
        journeyInsights
      );

      // Identify risks and opportunities with enhanced context
      const riskFactors = this.identifyEnhancedRiskFactors(
        analysis, 
        leadScore, 
        sentiment,
        contextInsights,
        journeyInsights
      );
      
      const opportunities = this.identifyEnhancedOpportunities(
        analysis, 
        leadScore, 
        intent,
        contextInsights,
        journeyInsights
      );

      // Sync insights with FinnAI memory store
      await this.syncWithFinnAIMemory(leadId, {
        analysis,
        contextInsights,
        journeyInsights,
        recommendations
      });

      return {
        leadTemperature: Math.max(analysis.leadTemperature, journeyInsights.probability * 100),
        urgencyLevel: this.determineUrgencyLevel(intent, journeyInsights, contextInsights),
        nextBestActions: recommendations,
        followUpScheduling,
        conversationStage: journeyInsights.stage || analysis.conversationStage,
        riskFactors,
        opportunities
      };
    } catch (error) {
      console.error('❌ Error in enhanced conversation context analysis:', error);
      throw error;
    }
  }

  private generateEnhancedRecommendations(
    analysis: any,
    leadScore: any,
    sentiment: any,
    intent: any,
    contextInsights: any,
    journeyInsights: any,
    enhancedAIResponse: any
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // AI-generated response recommendation
    if (enhancedAIResponse?.message) {
      recommendations.push({
        id: 'ai_response',
        type: 'immediate',
        priority: 'high',
        action: 'Send AI-generated contextual response',
        reasoning: `FinnAI generated: "${enhancedAIResponse.message.substring(0, 100)}..."`,
        automatable: true,
        confidence: enhancedAIResponse.confidence || 0.8,
        expectedOutcome: 'Contextually appropriate response maintaining conversation flow'
      });
    }

    // Journey stage-based recommendations
    switch (journeyInsights.stage) {
      case 'awareness':
        recommendations.push({
          id: 'awareness_nurture',
          type: 'immediate',
          priority: 'medium',
          action: 'Share educational content about vehicle features',
          reasoning: 'Customer is in awareness stage, needs education',
          automatable: true,
          confidence: 0.7,
          expectedOutcome: 'Move customer to consideration stage'
        });
        break;
        
      case 'consideration':
        recommendations.push({
          id: 'consideration_demo',
          type: 'immediate',
          priority: 'high',
          action: 'Offer vehicle demonstration or test drive',
          reasoning: 'Customer is actively considering, ready for hands-on experience',
          automatable: false,
          confidence: 0.9,
          expectedOutcome: 'Advance to decision stage'
        });
        break;
        
      case 'decision':
        recommendations.push({
          id: 'decision_close',
          type: 'immediate',
          priority: 'critical',
          action: 'Present personalized offer and begin closing process',
          reasoning: 'Customer is ready to make a decision',
          automatable: false,
          confidence: 0.95,
          expectedOutcome: 'Close sale within 24-48 hours'
        });
        break;
    }

    // Behavioral pattern recommendations
    if (contextInsights.recentPatterns.includes('high_question_frequency')) {
      recommendations.push({
        id: 'detailed_info',
        type: 'immediate',
        priority: 'medium',
        action: 'Provide comprehensive information package',
        reasoning: 'Customer shows pattern of asking many questions',
        automatable: true,
        confidence: 0.8,
        expectedOutcome: 'Reduce question volume and increase satisfaction'
      });
    }

    // Emotional state recommendations
    if (contextInsights.emotionalState === 'frustrated') {
      recommendations.push({
        id: 'empathy_response',
        type: 'immediate',
        priority: 'high',
        action: 'Acknowledge concerns with empathetic response',
        reasoning: 'Customer emotional state requires careful handling',
        automatable: true,
        confidence: 0.9,
        expectedOutcome: 'Improve customer satisfaction and prevent churn'
      });
    }

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

    return recommendations.slice(0, 5);
  }

  private determineEnhancedFollowUpScheduling(
    analysis: any,
    leadScore: any,
    recommendations: AIRecommendation[],
    journeyInsights: any
  ) {
    // High urgency based on journey insights
    if (journeyInsights.urgency === 'high' || recommendations.some(r => r.priority === 'critical')) {
      return {
        shouldSchedule: true,
        suggestedTime: '1 hour',
        reason: 'High urgency detected from journey analysis - immediate follow-up required'
      };
    }

    // Journey stage-based timing
    switch (journeyInsights.stage) {
      case 'decision':
        return {
          shouldSchedule: true,
          suggestedTime: '2 hours',
          reason: 'Customer in decision stage - quick follow-up to maintain momentum'
        };
      case 'consideration':
        return {
          shouldSchedule: true,
          suggestedTime: '6 hours',
          reason: 'Customer considering options - timely follow-up with relevant information'
        };
      default:
        return {
          shouldSchedule: true,
          suggestedTime: '24 hours',
          reason: 'Standard nurturing based on customer journey stage'
        };
    }
  }

  private identifyEnhancedRiskFactors(
    analysis: any,
    leadScore: any,
    sentiment: any,
    contextInsights: any,
    journeyInsights: any
  ): string[] {
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

    // Enhanced risk factors from context
    if (contextInsights.emotionalState === 'frustrated') {
      risks.push('Customer showing signs of frustration');
    }

    if (journeyInsights.probability < 0.3) {
      risks.push('Low conversion probability based on journey analysis');
    }

    if (contextInsights.communicationStyle === 'avoiding') {
      risks.push('Customer avoiding direct communication');
    }

    return risks;
  }

  private identifyEnhancedOpportunities(
    analysis: any,
    leadScore: any,
    intent: any,
    contextInsights: any,
    journeyInsights: any
  ): string[] {
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

    // Enhanced opportunities from context
    if (contextInsights.emotionalState === 'excited') {
      opportunities.push('Customer showing high excitement - excellent closing opportunity');
    }

    if (journeyInsights.stage === 'decision' && journeyInsights.probability > 0.7) {
      opportunities.push('High-probability decision-stage customer ready to close');
    }

    if (contextInsights.communicationStyle === 'engaged') {
      opportunities.push('Highly engaged customer - perfect for upselling opportunities');
    }

    return opportunities;
  }

  private determineUrgencyLevel(
    intent: any,
    journeyInsights: any,
    contextInsights: any
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (journeyInsights.urgency === 'high' || contextInsights.emotionalState === 'frustrated') {
      return 'critical';
    }
    
    if (journeyInsights.stage === 'decision' || intent.overallUrgency === 'high') {
      return 'high';
    }
    
    if (journeyInsights.probability > 0.6) {
      return 'medium';
    }
    
    return 'low';
  }

  private async syncWithFinnAIMemory(leadId: string, insights: any): Promise<void> {
    try {
      // Update conversation memory with latest insights
      await enhancedContextEngine.processMessage(
        leadId,
        `AI Analysis: Lead temperature ${insights.analysis.leadTemperature}%, Stage: ${insights.journeyInsights.stage}`,
        'out'
      );

      // Track touchpoint in customer journey
      await customerJourneyTracker.trackTouchpoint(
        leadId,
        'ai_analysis',
        'system',
        {
          leadTemperature: insights.analysis.leadTemperature,
          stage: insights.journeyInsights.stage,
          recommendationsCount: insights.recommendations.length
        },
        'positive'
      );

      console.log('✅ Synchronized insights with FinnAI memory store');
    } catch (error) {
      console.error('❌ Error syncing with FinnAI memory:', error);
    }
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
