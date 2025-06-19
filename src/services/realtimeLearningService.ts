
import { supabase } from '@/integrations/supabase/client';
import { aiLearningService } from '@/services/aiLearningService';

export interface LearningEvent {
  type: 'message_sent' | 'response_received' | 'conversion' | 'feedback_submitted';
  leadId: string;
  data: any;
  timestamp: Date;
}

export interface OptimizationTrigger {
  id: string;
  triggerType: 'poor_performance' | 'high_success' | 'pattern_detected';
  leadId?: string;
  confidence: number;
  action: 'adjust_timing' | 'modify_template' | 'change_frequency' | 'escalate_human';
  data: any;
}

class RealtimeLearningService {
  private optimizationQueue: OptimizationTrigger[] = [];
  private learningBuffer: LearningEvent[] = [];

  // Process learning events in real-time
  async processLearningEvent(event: LearningEvent) {
    console.log('Processing learning event:', event);
    
    this.learningBuffer.push(event);
    
    // Process events in batches for efficiency
    if (this.learningBuffer.length >= 5) {
      await this.processBatchLearning();
    }

    // Check for optimization opportunities
    const trigger = await this.detectOptimizationTrigger(event);
    if (trigger) {
      this.optimizationQueue.push(trigger);
      await this.executeOptimization(trigger);
    }
  }

  // Process multiple learning events at once
  private async processBatchLearning() {
    try {
      const events = [...this.learningBuffer];
      this.learningBuffer = [];

      for (const event of events) {
        switch (event.type) {
          case 'message_sent':
            await this.trackMessagePerformance(event);
            break;
          case 'response_received':
            await this.updateResponsePatterns(event);
            break;
          case 'conversion':
            await this.recordConversionSuccess(event);
            break;
          case 'feedback_submitted':
            await this.incorporateFeedback(event);
            break;
        }
      }
    } catch (error) {
      console.error('Error processing batch learning:', error);
    }
  }

  // Detect when optimization is needed
  private async detectOptimizationTrigger(event: LearningEvent): Promise<OptimizationTrigger | null> {
    const { leadId } = event;

    // Get recent performance for this lead
    const recent = await supabase
      .from('ai_message_feedback')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recent.data || recent.data.length < 3) return null;

    const negativeCount = recent.data.filter(f => f.feedback_type === 'negative').length;
    const positiveCount = recent.data.filter(f => f.feedback_type === 'positive').length;

    // Trigger if performance is poor
    if (negativeCount >= 3) {
      return {
        id: `poor_performance_${leadId}_${Date.now()}`,
        triggerType: 'poor_performance',
        leadId,
        confidence: 0.9,
        action: 'modify_template',
        data: { negativeCount, recentFeedback: recent.data }
      };
    }

    // Trigger if performance is excellent
    if (positiveCount >= 4) {
      return {
        id: `high_success_${leadId}_${Date.now()}`,
        triggerType: 'high_success',
        leadId,
        confidence: 0.95,
        action: 'adjust_timing',
        data: { positiveCount, pattern: 'success_pattern' }
      };
    }

    return null;
  }

  // Execute optimization based on trigger
  private async executeOptimization(trigger: OptimizationTrigger) {
    console.log('Executing optimization:', trigger);

    try {
      switch (trigger.action) {
        case 'modify_template':
          await this.optimizeMessageTemplate(trigger);
          break;
        case 'adjust_timing':
          await this.optimizeMessageTiming(trigger);
          break;
        case 'change_frequency':
          await this.optimizeMessageFrequency(trigger);
          break;
        case 'escalate_human':
          await this.escalateToHuman(trigger);
          break;
      }
    } catch (error) {
      console.error('Error executing optimization:', error);
    }
  }

  // Track message performance metrics
  private async trackMessagePerformance(event: LearningEvent) {
    const { leadId, data } = event;

    await supabase.from('ai_message_analytics').insert({
      lead_id: leadId,
      message_content: data.content,
      message_stage: data.stage,
      template_id: data.templateId,
      sent_at: event.timestamp.toISOString(),
      hour_of_day: event.timestamp.getHours(),
      day_of_week: event.timestamp.getDay()
    });
  }

  // Update response patterns for lead
  private async updateResponsePatterns(event: LearningEvent) {
    const { leadId, data } = event;

    await supabase
      .from('lead_response_patterns')
      .upsert({
        lead_id: leadId,
        total_responses: data.totalResponses || 1,
        avg_response_time_hours: data.responseTimeHours,
        best_response_hours: data.bestHours || [],
        updated_at: new Date().toISOString()
      });
  }

  // Record successful conversion
  private async recordConversionSuccess(event: LearningEvent) {
    const { leadId, data } = event;

    await aiLearningService.trackLearningOutcome({
      leadId,
      messageId: data.messageId,
      outcomeType: data.conversionType,
      outcomeValue: data.value,
      messageCharacteristics: data.messageCharacteristics,
      leadCharacteristics: data.leadCharacteristics
    });
  }

  // Incorporate user feedback
  private async incorporateFeedback(event: LearningEvent) {
    const { leadId, data } = event;

    await aiLearningService.submitMessageFeedback({
      leadId,
      messageContent: data.messageContent,
      feedbackType: data.feedbackType,
      rating: data.rating,
      improvementSuggestions: data.suggestions,
      conversationId: data.conversationId
    });
  }

  // Optimize message template based on poor performance
  private async optimizeMessageTemplate(trigger: OptimizationTrigger) {
    if (!trigger.leadId) return;

    // Get lead preferences
    const { data: patterns } = await supabase
      .from('lead_communication_patterns')
      .select('*')
      .eq('lead_id', trigger.leadId)
      .single();

    // Update communication pattern with learned preferences
    if (patterns) {
      const updatedPreferences = {
        ...(patterns.content_preferences || {}),
        avoid_negative_triggers: true,
        preferred_tone: 'consultative',
        last_optimization: new Date().toISOString()
      };

      await supabase
        .from('lead_communication_patterns')
        .update({
          content_preferences: updatedPreferences,
          learning_confidence: Math.min(1.0, (patterns.learning_confidence || 0) + 0.1)
        })
        .eq('lead_id', trigger.leadId);
    }
  }

  // Optimize message timing
  private async optimizeMessageTiming(trigger: OptimizationTrigger) {
    if (!trigger.leadId) return;

    const { data: responseTimes } = await supabase
      .from('ai_message_analytics')
      .select('hour_of_day, response_time_hours')
      .eq('lead_id', trigger.leadId)
      .not('response_time_hours', 'is', null);

    if (responseTimes && responseTimes.length > 0) {
      // Find optimal hours based on response times
      const optimalHours = responseTimes
        .filter(r => r.response_time_hours < 2) // Quick responses
        .map(r => r.hour_of_day);

      await supabase
        .from('lead_contact_timing')
        .upsert({
          lead_id: trigger.leadId,
          best_contact_hours: optimalHours,
          last_optimal_contact: new Date().toISOString()
        });
    }
  }

  // Optimize message frequency
  private async optimizeMessageFrequency(trigger: OptimizationTrigger) {
    // Implementation for frequency optimization
    console.log('Optimizing message frequency for trigger:', trigger);
  }

  // Escalate to human when AI performance is consistently poor
  private async escalateToHuman(trigger: OptimizationTrigger) {
    if (!trigger.leadId) return;

    await supabase.from('leads').update({
      ai_sequence_paused: true,
      notes: `AI learning escalation: ${trigger.triggerType} detected. Requires human intervention.`
    }).eq('id', trigger.leadId);
  }

  // Get optimization insights
  async getOptimizationInsights(timeframe: 'hour' | 'day' | 'week' = 'day') {
    const hours = timeframe === 'hour' ? 1 : timeframe === 'day' ? 24 : 168;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: feedback } = await supabase
      .from('ai_message_feedback')
      .select('*')
      .gte('created_at', since);

    const { data: outcomes } = await supabase
      .from('ai_learning_outcomes')
      .select('*')
      .gte('created_at', since);

    return {
      totalOptimizations: this.optimizationQueue.length,
      recentFeedback: feedback || [],
      recentOutcomes: outcomes || [],
      activeOptimizations: this.optimizationQueue.filter(t => 
        new Date(Date.now() - 60 * 60 * 1000) < new Date()
      )
    };
  }
}

export const realtimeLearningService = new RealtimeLearningService();
