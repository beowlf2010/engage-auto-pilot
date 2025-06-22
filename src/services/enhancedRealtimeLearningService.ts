
import { supabase } from '@/integrations/supabase/client';
import { aiDataSeeder } from './aiDataSeeder';

export interface LearningEvent {
  type: 'message_sent' | 'response_received' | 'conversation_analyzed' | 'feedback_provided';
  leadId: string;
  data: any;
  timestamp: Date;
}

class EnhancedRealtimeLearningService {
  private learningQueue: LearningEvent[] = [];
  private isProcessing = false;

  async initialize() {
    console.log('🧠 [ENHANCED LEARNING] Initializing enhanced real-time learning service');
    
    // Check if we have any learning data, if not populate it
    const { data: existingInsights } = await supabase
      .from('ai_learning_insights')
      .select('id')
      .limit(1);

    if (!existingInsights || existingInsights.length === 0) {
      console.log('🌱 [ENHANCED LEARNING] No learning data found, seeding initial data...');
      try {
        await aiDataSeeder.seedLearningData();
        await aiDataSeeder.seedDailyMetrics();
      } catch (error) {
        console.warn('⚠️ [ENHANCED LEARNING] Failed to seed data:', error);
      }
    }
  }

  async processLearningEvent(event: LearningEvent) {
    this.learningQueue.push(event);
    
    if (!this.isProcessing) {
      this.isProcessing = true;
      await this.processQueue();
      this.isProcessing = false;
    }
  }

  private async processQueue() {
    while (this.learningQueue.length > 0) {
      const event = this.learningQueue.shift();
      if (event) {
        try {
          await this.handleLearningEvent(event);
        } catch (error) {
          console.error('❌ [ENHANCED LEARNING] Error processing event:', error);
        }
      }
    }
  }

  private async handleLearningEvent(event: LearningEvent) {
    console.log(`🔄 [ENHANCED LEARNING] Processing ${event.type} for lead ${event.leadId}`);

    switch (event.type) {
      case 'message_sent':
        await this.trackMessageSent(event);
        break;
      case 'response_received':
        await this.trackResponseReceived(event);
        break;
      case 'conversation_analyzed':
        await this.trackConversationAnalyzed(event);
        break;
      case 'feedback_provided':
        await this.trackFeedbackProvided(event);
        break;
    }
  }

  private async trackMessageSent(event: LearningEvent) {
    // Create learning outcome entry
    await supabase.from('ai_learning_outcomes').insert({
      lead_id: event.leadId,
      outcome_type: 'message_sent',
      message_characteristics: {
        content: event.data.content,
        length: event.data.messageLength,
        sent_hour: new Date().getHours()
      },
      seasonal_context: {
        hour: new Date().getHours(),
        day_of_week: new Date().getDay(),
        month: new Date().getMonth()
      }
    });

    // Update template performance if it's AI generated
    if (event.data.aiGenerated) {
      await this.updateTemplatePerformance(event.data.content);
    }
  }

  private async trackResponseReceived(event: LearningEvent) {
    // Update learning outcome with response data
    await supabase.from('ai_learning_outcomes').insert({
      lead_id: event.leadId,
      outcome_type: 'response_received',
      days_to_outcome: 1,
      message_characteristics: {
        response_time_hours: event.data.responseTimeHours
      }
    });

    // Generate new insights if needed
    await this.generateResponseTimeInsight(event);
  }

  private async trackConversationAnalyzed(event: LearningEvent) {
    // Create conversation summary and insights
    await supabase.from('ai_learning_insights').insert({
      lead_id: event.leadId,
      insight_type: 'conversation_analysis',
      insight_title: 'Conversation Pattern Detected',
      insight_description: `Analyzed conversation with ${event.data.messageCount} messages`,
      impact_level: 'low',
      confidence_score: 0.6,
      actionable: false,
      insight_data: {
        message_count: event.data.messageCount,
        conversation_length: event.data.conversationLength,
        last_direction: event.data.lastMessageDirection
      }
    });
  }

  private async trackFeedbackProvided(event: LearningEvent) {
    // Store feedback and update template performance
    await supabase.from('ai_message_feedback').insert({
      lead_id: event.leadId,
      message_content: event.data.messageContent,
      feedback_type: event.data.feedbackType,
      rating: event.data.rating || 3,
      response_received: true
    });
  }

  private async updateTemplatePerformance(messageContent: string) {
    // Update or create template performance record
    const { data: existing } = await supabase
      .from('ai_template_performance')
      .select('id, usage_count')
      .eq('template_content', messageContent)
      .single();

    if (existing) {
      await supabase
        .from('ai_template_performance')
        .update({
          usage_count: existing.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('ai_template_performance').insert({
        template_content: messageContent,
        template_variant: 'default',
        usage_count: 1,
        response_count: 0,
        positive_responses: 0,
        conversion_count: 0,
        performance_score: 0.5
      });
    }
  }

  private async generateResponseTimeInsight(event: LearningEvent) {
    const responseTime = event.data.responseTimeHours;
    
    if (responseTime && responseTime < 2) {
      // Generate insight about fast response times
      await supabase.from('ai_learning_insights').insert({
        lead_id: event.leadId,
        insight_type: 'response_timing',
        insight_title: 'Fast Response Detected',
        insight_description: `Lead responded in ${responseTime.toFixed(1)} hours - consider this timing for future messages`,
        impact_level: 'medium',
        confidence_score: 0.75,
        actionable: true,
        insight_data: {
          response_time: responseTime,
          recommended_timing: Math.floor(responseTime)
        }
      });
    }
  }

  async getOptimizationInsights(leadId?: string) {
    try {
      // Get insights
      const insightsQuery = supabase
        .from('ai_learning_insights')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leadId) {
        insightsQuery.or(`lead_id.eq.${leadId},applies_globally.eq.true`);
      } else {
        insightsQuery.eq('applies_globally', true);
      }
      
      const { data: insights } = await insightsQuery.limit(10);

      // Get active optimizations (template performance)
      const { data: activeOptimizations } = await supabase
        .from('ai_template_performance')
        .select('*')
        .order('performance_score', { ascending: false })
        .limit(5);

      return {
        insights: insights || [],
        activeOptimizations: activeOptimizations || [],
        summary: {
          totalInsights: insights?.length || 0,
          highImpact: insights?.filter(i => i.impact_level === 'high').length || 0,
          actionable: insights?.filter(i => i.actionable).length || 0
        }
      };
    } catch (error) {
      console.error('❌ [ENHANCED LEARNING] Error getting optimization insights:', error);
      return {
        insights: [],
        activeOptimizations: [],
        summary: { totalInsights: 0, highImpact: 0, actionable: 0 }
      };
    }
  }
}

export const enhancedRealtimeLearningService = new EnhancedRealtimeLearningService();
