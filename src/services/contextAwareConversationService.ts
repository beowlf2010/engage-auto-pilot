import { supabase } from '@/integrations/supabase/client';

interface ConversationFlowAnalysis {
  stage: 'initial' | 'discovery' | 'interest' | 'objection' | 'closing' | 'nurture';
  momentum: 'increasing' | 'stable' | 'decreasing';
  engagement_level: number;
  next_best_action: string;
  timing_recommendation: 'immediate' | 'delayed' | 'scheduled';
}

interface ConversationPattern {
  pattern_id: string;
  pattern_type: 'successful_conversion' | 'engagement_recovery' | 'timing_optimization';
  trigger_conditions: string[];
  success_rate: number;
  recommended_response_style: string;
}

class ContextAwareConversationService {
  async analyzeConversationFlow(
    leadId: string,
    conversationHistory: string[],
    leadMetadata?: any
  ): Promise<ConversationFlowAnalysis> {
    try {
      console.log('🌊 [CONVERSATION-FLOW] Analyzing conversation flow for lead:', leadId);

      // Analyze conversation momentum
      const momentum = this.calculateConversationMomentum(conversationHistory);
      
      // Determine conversation stage
      const stage = this.determineConversationStage(conversationHistory, leadMetadata);
      
      // Calculate engagement level
      const engagement_level = this.calculateEngagementLevel(conversationHistory);
      
      // Get timing recommendation
      const timing_recommendation = await this.getOptimalTimingRecommendation(leadId, stage);
      
      // Determine next best action
      const next_best_action = this.getNextBestAction(stage, momentum, engagement_level);

      const analysis: ConversationFlowAnalysis = {
        stage,
        momentum,
        engagement_level,
        next_best_action,
        timing_recommendation
      };

      console.log('✅ [CONVERSATION-FLOW] Analysis complete:', {
        stage,
        momentum,
        engagement: Math.round(engagement_level * 100) + '%',
        action: next_best_action,
        timing: timing_recommendation
      });

      return analysis;

    } catch (error) {
      console.error('❌ [CONVERSATION-FLOW] Error analyzing conversation flow:', error);
      return {
        stage: 'discovery',
        momentum: 'stable',
        engagement_level: 0.5,
        next_best_action: 'continue_discovery',
        timing_recommendation: 'immediate'
      };
    }
  }

  async getSuccessfulConversationPatterns(
    currentStage: string,
    leadCharacteristics?: any
  ): Promise<ConversationPattern[]> {
    try {
      console.log('📈 [CONVERSATION-PATTERNS] Getting successful patterns for stage:', currentStage);

      // In a real implementation, this would query historical successful conversations
      const mockPatterns: ConversationPattern[] = [
        {
          pattern_id: 'early_vehicle_focus',
          pattern_type: 'successful_conversion',
          trigger_conditions: ['stage:discovery', 'vehicle_mentioned', 'price_not_discussed'],
          success_rate: 0.78,
          recommended_response_style: 'enthusiastic_vehicle_focused'
        },
        {
          pattern_id: 'objection_acknowledgment',
          pattern_type: 'engagement_recovery',
          trigger_conditions: ['objection_detected', 'engagement_decreasing'],
          success_rate: 0.65,
          recommended_response_style: 'empathetic_solution_oriented'
        },
        {
          pattern_id: 'optimal_follow_up_timing',
          pattern_type: 'timing_optimization',
          trigger_conditions: ['no_response_24h', 'previous_positive_engagement'],
          success_rate: 0.71,
          recommended_response_style: 'gentle_check_in'
        }
      ];

      return mockPatterns.filter(pattern => 
        pattern.trigger_conditions.some(condition => 
          condition.includes(currentStage) || condition.includes('stage:' + currentStage)
        )
      );

    } catch (error) {
      console.error('❌ [CONVERSATION-PATTERNS] Error getting patterns:', error);
      return [];
    }
  }

  async trackConversationOutcome(
    leadId: string,
    conversationAnalysis: ConversationFlowAnalysis,
    actualOutcome: string,
    outcomeValue?: number
  ): Promise<void> {
    try {
      console.log('📊 [CONVERSATION-TRACKING] Tracking outcome for lead:', leadId);

      // Store conversation outcome for future pattern analysis
      await supabase
        .from('ai_learning_insights')
        .insert({
          insight_type: 'performance',
          insight_title: `Conversation Outcome: ${actualOutcome}`,
          insight_description: `Stage: ${conversationAnalysis.stage}, Momentum: ${conversationAnalysis.momentum}, Engagement: ${Math.round(conversationAnalysis.engagement_level * 100)}%`,
          confidence_score: conversationAnalysis.engagement_level,
          impact_level: outcomeValue && outcomeValue > 0.7 ? 'high' : 'medium',
          actionable: true,
          lead_id: leadId,
          insight_data: {
            conversation_stage: conversationAnalysis.stage,
            momentum: conversationAnalysis.momentum,
            engagement_level: conversationAnalysis.engagement_level,
            predicted_action: conversationAnalysis.next_best_action,
            actual_outcome: actualOutcome,
            timing_recommendation: conversationAnalysis.timing_recommendation
          }
        });

      console.log('✅ [CONVERSATION-TRACKING] Outcome tracked successfully');

    } catch (error) {
      console.error('❌ [CONVERSATION-TRACKING] Error tracking outcome:', error);
    }
  }

  private calculateConversationMomentum(conversationHistory: string[]): 'increasing' | 'stable' | 'decreasing' {
    if (conversationHistory.length < 4) return 'stable';

    // Analyze recent message patterns
    const recentMessages = conversationHistory.slice(-4);
    const customerMessages = recentMessages.filter(msg => msg.startsWith('Customer:'));
    const responseMessages = recentMessages.filter(msg => msg.startsWith('You:'));

    // Increasing momentum indicators
    const hasQuestions = customerMessages.some(msg => msg.includes('?'));
    const hasSchedulingLanguage = conversationHistory.join(' ').toLowerCase().includes('schedule') 
      || conversationHistory.join(' ').toLowerCase().includes('appointment')
      || conversationHistory.join(' ').toLowerCase().includes('visit');
    
    // Decreasing momentum indicators  
    const hasShortResponses = customerMessages.some(msg => msg.length < 30);
    const hasDelayIndicators = conversationHistory.join(' ').toLowerCase().includes('think about it')
      || conversationHistory.join(' ').toLowerCase().includes('get back to you');

    if (hasSchedulingLanguage || (hasQuestions && !hasDelayIndicators)) {
      return 'increasing';
    } else if (hasShortResponses || hasDelayIndicators) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private determineConversationStage(
    conversationHistory: string[], 
    leadMetadata?: any
  ): 'initial' | 'discovery' | 'interest' | 'objection' | 'closing' | 'nurture' {
    const conversationText = conversationHistory.join(' ').toLowerCase();
    const messageCount = conversationHistory.length;

    // Check for specific stage indicators
    if (conversationText.includes('price') && conversationText.includes('when can')) {
      return 'closing';
    } else if (conversationText.includes('but') || conversationText.includes('however') || 
               conversationText.includes('concern')) {
      return 'objection';
    } else if (conversationText.includes('interested') || conversationText.includes('like that') ||
               conversationText.includes('sounds good')) {
      return 'interest';
    } else if (messageCount > 10) {
      return 'nurture';
    } else if (messageCount > 3) {
      return 'discovery';
    } else {
      return 'initial';
    }
  }

  private calculateEngagementLevel(conversationHistory: string[]): number {
    let engagementScore = 0.5; // Base score

    const customerMessages = conversationHistory.filter(msg => msg.startsWith('Customer:'));
    
    if (customerMessages.length === 0) return 0.3;

    // Message frequency and length
    const avgMessageLength = customerMessages.reduce((sum, msg) => sum + msg.length, 0) / customerMessages.length;
    if (avgMessageLength > 100) engagementScore += 0.2;
    else if (avgMessageLength > 50) engagementScore += 0.1;

    // Questions indicate engagement
    const questionCount = customerMessages.filter(msg => msg.includes('?')).length;
    engagementScore += Math.min(0.2, questionCount * 0.05);

    // Enthusiasm indicators
    const enthusiasm = conversationHistory.join(' ').toLowerCase();
    if (enthusiasm.includes('excited') || enthusiasm.includes('love') || enthusiasm.includes('perfect')) {
      engagementScore += 0.2;
    }

    // Specific interest indicators
    if (enthusiasm.includes('schedule') || enthusiasm.includes('appointment') || enthusiasm.includes('see it')) {
      engagementScore += 0.15;
    }

    return Math.min(1.0, Math.max(0.1, engagementScore));
  }

  private async getOptimalTimingRecommendation(
    leadId: string, 
    stage: string
  ): Promise<'immediate' | 'delayed' | 'scheduled'> {
    try {
      // Get lead's historical response patterns
      const { data: responsePattern } = await supabase
        .from('lead_response_patterns')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      const currentHour = new Date().getHours();
      
      // Business hours check
      if (currentHour < 9 || currentHour > 17) {
        return 'scheduled';
      }

      // Stage-based timing
      if (stage === 'closing' || stage === 'interest') {
        return 'immediate';
      } else if (stage === 'objection') {
        return 'delayed';
      } else {
        return responsePattern?.best_response_hours?.length > 0 ? 'scheduled' : 'immediate';
      }

    } catch (error) {
      console.error('❌ [TIMING] Error getting timing recommendation:', error);
      return 'immediate';
    }
  }

  private getNextBestAction(
    stage: string, 
    momentum: string, 
    engagementLevel: number
  ): string {
    if (momentum === 'decreasing' && engagementLevel < 0.4) {
      return 'engagement_recovery';
    }

    switch (stage) {
      case 'initial':
        return 'build_rapport';
      case 'discovery':
        return 'identify_needs';
      case 'interest':
        return momentum === 'increasing' ? 'schedule_appointment' : 'provide_more_info';
      case 'objection':
        return 'address_concerns';
      case 'closing':
        return 'confirm_next_steps';
      case 'nurture':
        return 'maintain_relationship';
      default:
        return 'continue_conversation';
    }
  }
}

export const contextAwareConversationService = new ContextAwareConversationService();