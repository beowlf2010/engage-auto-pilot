import { supabase } from '@/integrations/supabase/client';
import { customerJourneyTracker } from './finnAI/customerJourneyTracker';

export interface ContextualInsights {
  leadTemperature: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  conversationStage: 'initial_contact' | 'interest_building' | 'objection_handling' | 'decision' | 'closing';
  riskFactors: string[];
  opportunities: string[];
  nextBestActions: AIRecommendation[];
  followUpScheduling: {
    shouldSchedule: boolean;
    suggestedTime: string;
    reason: string;
  };
}

export interface AIRecommendation {
  id: string;
  action: string;
  type: 'immediate' | 'scheduled' | 'reminder';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  automatable: boolean;
}

class ContextualAIAssistant {
  async analyzeConversationContext(
    leadId: string,
    conversationHistory: string,
    latestMessage: string
  ): Promise<ContextualInsights> {
    try {
      console.log('🧠 Analyzing conversation context for lead:', leadId);

      // 1. Determine Lead Temperature
      const leadTemperature = this.calculateLeadTemperature(conversationHistory);

      // 2. Determine Conversation Stage
      const conversationStage = this.determineConversationStage(conversationHistory);

      // 3. Detect Risk Factors
      const riskFactors = this.detectRiskFactors(conversationHistory);

      // 4. Identify Opportunities
      const opportunities = this.identifyOpportunities(conversationHistory);

      // 5. Generate Next Best Actions
      const nextBestActions = this.generateNextBestActions(
        leadId,
        conversationHistory,
        conversationStage
      );

      // 6. Determine Urgency Level
      const urgencyLevel = this.determineUrgencyLevel(leadTemperature, conversationStage);

      // 7. Assess Follow-Up Scheduling
      const followUpScheduling = this.assessFollowUpScheduling(
        leadId,
        conversationHistory,
        urgencyLevel
      );

      // 8. Update Lead Profile with correct database fields
      await this.updateLeadProfile(leadId, {
        ai_stage: conversationStage,
        conversion_probability: leadTemperature / 100, // Convert percentage to decimal
        message_intensity: urgencyLevel
      });

      return {
        leadTemperature,
        urgencyLevel,
        conversationStage,
        riskFactors,
        opportunities,
        nextBestActions,
        followUpScheduling
      };
    } catch (error) {
      console.error('❌ Error analyzing conversation context:', error);
      throw error;
    }
  }

  async scheduleAutomatedFollowUp(
    leadId: string, 
    action: AIRecommendation, 
    insights: ContextualInsights
  ): Promise<void> {
    try {
      console.log('📅 Scheduling automated follow-up for lead:', leadId);

      // Create scheduled message entry
      await supabase
        .from('ai_message_approval_queue')
        .insert({
          lead_id: leadId,
          message_content: `Follow-up: ${action.action}`,
          message_stage: insights.conversationStage,
          urgency_level: action.priority,
          scheduled_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          auto_approved: action.automatable
        });

      // Track in customer journey
      await customerJourneyTracker.trackTouchpoint(
        leadId,
        'ai_analysis',
        'system',
        {
          action: action.action,
          stage: insights.conversationStage,
          confidence: action.confidence,
          scheduled: true
        },
        'neutral'
      );

      console.log('✅ Automated follow-up scheduled successfully');
    } catch (error) {
      console.error('❌ Error scheduling automated follow-up:', error);
    }
  }

  generateFollowUpSuggestions(
    leadId: string,
    conversationHistory: string
  ): string[] {
    const suggestions: string[] = [];

    if (conversationHistory.includes('interested in a test drive')) {
      suggestions.push('Confirm the test drive appointment.');
    }

    if (conversationHistory.includes('financing options')) {
      suggestions.push('Send information about financing.');
    }

    return suggestions;
  }

  async updateLeadProfile(
    leadId: string,
    updates: Partial<{
      ai_stage: string;
      conversion_probability: number;
      message_intensity: string;
    }>
  ): Promise<void> {
    try {
      console.log('👤 Updating lead profile for lead:', leadId);

      await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      console.log('✅ Lead profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating lead profile:', error);
    }
  }

  private determineConversationStage(conversationHistory: string): 'initial_contact' | 'interest_building' | 'objection_handling' | 'decision' | 'closing' {
    const lowerHistory = conversationHistory.toLowerCase();
    
    if (lowerHistory.includes('price') || lowerHistory.includes('payment') || lowerHistory.includes('finance')) {
      return 'decision';
    }
    
    if (lowerHistory.includes('but') || lowerHistory.includes('however') || lowerHistory.includes('concern')) {
      return 'objection_handling';
    }
    
    if (lowerHistory.includes('interested') || lowerHistory.includes('tell me more') || lowerHistory.includes('details')) {
      return 'interest_building';
    }
    
    if (lowerHistory.includes('deal') || lowerHistory.includes('purchase') || lowerHistory.includes('buy')) {
      return 'closing';
    }
    
    return 'initial_contact';
  }

  private calculateLeadTemperature(conversationHistory: string): number {
    let temperature = 20;

    if (conversationHistory.includes('interested')) {
      temperature += 30;
    }

    if (conversationHistory.includes('test drive')) {
      temperature += 25;
    }

    if (conversationHistory.includes('price')) {
      temperature += 15;
    }

    if (conversationHistory.includes('financing')) {
      temperature += 10;
    }

    return Math.min(100, temperature);
  }

  private detectRiskFactors(conversationHistory: string): string[] {
    const riskFactors: string[] = [];

    if (conversationHistory.includes('not interested')) {
      riskFactors.push('Customer expressed disinterest.');
    }

    if (conversationHistory.includes('already bought')) {
      riskFactors.push('Customer has already made a purchase elsewhere.');
    }

    return riskFactors;
  }

  private identifyOpportunities(conversationHistory: string): string[] {
    const opportunities: string[] = [];

    if (conversationHistory.includes('looking for a specific model')) {
      opportunities.push('Customer has a specific vehicle in mind.');
    }

    if (conversationHistory.includes('trade-in')) {
      opportunities.push('Customer is interested in trading in their current vehicle.');
    }

    return opportunities;
  }

  private generateNextBestActions(
    leadId: string,
    conversationHistory: string,
    conversationStage: string
  ): AIRecommendation[] {
    const actions: AIRecommendation[] = [];

    switch (conversationStage) {
      case 'initial_contact':
        actions.push({
          id: 'greet_customer',
          action: 'Send a personalized greeting message.',
          type: 'immediate',
          priority: 'medium',
          confidence: 0.7,
          reasoning: 'Customer has just initiated contact.',
          automatable: true
        });
        break;
      case 'interest_building':
        actions.push({
          id: 'provide_info',
          action: 'Provide detailed information about the vehicle.',
          type: 'immediate',
          priority: 'high',
          confidence: 0.8,
          reasoning: 'Customer is showing interest in the vehicle.',
          automatable: true
        });
        actions.push({
          id: 'schedule_test_drive',
          action: 'Offer to schedule a test drive.',
          type: 'immediate',
          priority: 'medium',
          confidence: 0.6,
          reasoning: 'Customer is asking for more details.',
          automatable: false
        });
        break;
      case 'objection_handling':
        actions.push({
          id: 'address_concerns',
          action: 'Address customer concerns and objections.',
          type: 'immediate',
          priority: 'critical',
          confidence: 0.9,
          reasoning: 'Customer has expressed concerns or objections.',
          automatable: false
        });
        break;
      case 'decision':
        actions.push({
          id: 'present_options',
          action: 'Present financing and purchase options.',
          type: 'immediate',
          priority: 'high',
          confidence: 0.8,
          reasoning: 'Customer is ready to make a decision.',
          automatable: true
        });
        break;
      case 'closing':
        actions.push({
          id: 'finalize_sale',
          action: 'Finalize the sale and complete the paperwork.',
          type: 'immediate',
          priority: 'critical',
          confidence: 0.95,
          reasoning: 'Customer is ready to close the deal.',
          automatable: false
        });
        break;
    }

    return actions;
  }

  private determineUrgencyLevel(
    leadTemperature: number,
    conversationStage: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (leadTemperature > 80 && conversationStage === 'decision') {
      return 'critical';
    }

    if (leadTemperature > 60 || conversationStage === 'objection_handling') {
      return 'high';
    }

    if (leadTemperature > 40) {
      return 'medium';
    }

    return 'low';
  }

  private assessFollowUpScheduling(
    leadId: string,
    conversationHistory: string,
    urgencyLevel: string
  ): { shouldSchedule: boolean; suggestedTime: string; reason: string } {
    if (urgencyLevel === 'critical') {
      return {
        shouldSchedule: true,
        suggestedTime: 'Immediately',
        reason: 'High urgency, potential sale at risk.'
      };
    }

    if (conversationHistory.includes('call back')) {
      return {
        shouldSchedule: true,
        suggestedTime: 'In 2 days',
        reason: 'Customer requested a call back.'
      };
    }

    return {
      shouldSchedule: false,
      suggestedTime: 'Not needed',
      reason: 'No immediate follow-up required.'
    };
  }
}

export const contextualAIAssistant = new ContextualAIAssistant();
