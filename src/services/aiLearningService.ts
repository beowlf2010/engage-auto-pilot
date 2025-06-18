
import { supabase } from '@/integrations/supabase/client';

export interface MessageFeedback {
  leadId: string;
  conversationId?: string;
  messageContent: string;
  feedbackType: 'positive' | 'negative' | 'neutral';
  rating?: number;
  improvementSuggestions?: string;
  issueCategory?: string;
  regenerationReason?: string;
}

export interface LearningOutcome {
  leadId: string;
  messageId?: string;
  outcomeType: 'appointment_booked' | 'test_drive_scheduled' | 'sale_completed' | 'lead_lost' | 'no_response';
  outcomeValue?: number;
  messageCharacteristics?: any;
  leadCharacteristics?: any;
}

export interface ConversationPattern {
  patternName: string;
  patternDescription: string;
  conversationFlow: any[];
  leadCharacteristics?: any;
  timingPatterns?: any;
  inventoryTypes?: any;
}

export const aiLearningService = {
  // Submit feedback for an AI message
  async submitMessageFeedback(feedback: MessageFeedback) {
    try {
      const { data, error } = await supabase
        .from('ai_message_feedback')
        .insert({
          lead_id: feedback.leadId,
          conversation_id: feedback.conversationId,
          message_content: feedback.messageContent,
          feedback_type: feedback.feedbackType,
          rating: feedback.rating,
          improvement_suggestions: feedback.improvementSuggestions,
          issue_category: feedback.issueCategory,
          regeneration_reason: feedback.regenerationReason
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting message feedback:', error);
      throw error;
    }
  },

  // Track learning outcomes
  async trackLearningOutcome(outcome: LearningOutcome) {
    try {
      const { data, error } = await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: outcome.leadId,
          message_id: outcome.messageId,
          outcome_type: outcome.outcomeType,
          outcome_value: outcome.outcomeValue,
          message_characteristics: outcome.messageCharacteristics,
          lead_characteristics: outcome.leadCharacteristics,
          seasonal_context: {
            hour: new Date().getHours(),
            day_of_week: new Date().getDay(),
            month: new Date().getMonth()
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error tracking learning outcome:', error);
      throw error;
    }
  },

  // Get AI performance metrics
  async getPerformanceMetrics(timeframe: 'week' | 'month' | 'quarter' = 'month') {
    try {
      const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get feedback metrics
      const { data: feedbackData } = await supabase
        .from('ai_message_feedback')
        .select('feedback_type, rating, created_at')
        .gte('created_at', startDate.toISOString());

      // Get outcome metrics
      const { data: outcomeData } = await supabase
        .from('ai_learning_outcomes')
        .select('outcome_type, outcome_value, created_at')
        .gte('created_at', startDate.toISOString());

      // Get template performance
      const { data: templateData } = await supabase
        .from('ai_template_performance')
        .select('*')
        .order('performance_score', { ascending: false })
        .limit(10);

      return {
        feedback: feedbackData || [],
        outcomes: outcomeData || [],
        topTemplates: templateData || []
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  },

  // Learn from lead communication patterns
  async updateLeadCommunicationPattern(leadId: string, patterns: any) {
    try {
      const { data, error } = await supabase
        .from('lead_communication_patterns')
        .upsert({
          lead_id: leadId,
          ...patterns,
          last_interaction_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating communication pattern:', error);
      throw error;
    }
  },

  // Get successful conversation patterns
  async getSuccessfulPatterns(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('successful_conversation_patterns')
        .select('*')
        .order('success_rate', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting successful patterns:', error);
      throw error;
    }
  },

  // Analyze message effectiveness
  async analyzeMessageEffectiveness(messageContent: string, leadId: string) {
    try {
      // Get historical performance of similar messages
      const { data, error } = await supabase
        .from('ai_message_feedback')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Calculate effectiveness score based on historical data
      const feedback = data || [];
      const positiveCount = feedback.filter(f => f.feedback_type === 'positive').length;
      const totalCount = feedback.length;
      const effectivenessScore = totalCount > 0 ? (positiveCount / totalCount) * 100 : 50;

      return {
        effectivenessScore,
        historicalFeedback: feedback,
        recommendations: this.generateRecommendations(feedback)
      };
    } catch (error) {
      console.error('Error analyzing message effectiveness:', error);
      throw error;
    }
  },

  // Generate improvement recommendations
  generateRecommendations(feedback: any[]) {
    const recommendations = [];
    
    if (!feedback || feedback.length === 0) {
      return recommendations;
    }
    
    const negativeCount = feedback.filter(f => f.feedback_type === 'negative').length;
    const lowRatings = feedback.filter(f => f.rating && typeof f.rating === 'number' && f.rating <= 2).length;
    const totalCount = feedback.length;
    
    if (totalCount > 0 && (negativeCount / totalCount) > 0.3) {
      recommendations.push('Consider adjusting message tone - high negative feedback rate');
    }
    
    if (totalCount > 0 && (lowRatings / totalCount) > 0.2) {
      recommendations.push('Message quality needs improvement - low ratings detected');
    }
    
    const commonIssues = feedback
      .filter(f => f.issue_category)
      .reduce((acc, f) => {
        acc[f.issue_category] = (acc[f.issue_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const topIssue = Object.entries(commonIssues)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topIssue) {
      recommendations.push(`Address ${topIssue[0]} issues - most common problem`);
    }
    
    return recommendations;
  }
};
