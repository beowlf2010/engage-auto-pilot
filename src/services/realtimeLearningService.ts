
import { supabase } from '@/integrations/supabase/client';
import { aiLearningService } from './aiLearningService';

export interface LearningEvent {
  type: 'message_sent' | 'response_received' | 'feedback_submitted' | 'appointment_booked' | 'conversation_analyzed';
  leadId: string;
  data: any;
  timestamp: Date;
}

export interface OptimizationInsight {
  id: string;
  type: 'pattern' | 'optimization' | 'prediction' | 'performance';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  leadId?: string;
  data?: any;
}

class RealtimeLearningService {
  private learningQueue: LearningEvent[] = [];
  private processingQueue = false;

  async processLearningEvent(event: LearningEvent): Promise<void> {
    console.log('🧠 Processing learning event:', event.type, 'for lead:', event.leadId);
    
    this.learningQueue.push(event);
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.learningQueue.length === 0) return;
    
    this.processingQueue = true;
    
    try {
      while (this.learningQueue.length > 0) {
        const event = this.learningQueue.shift()!;
        await this.handleSingleEvent(event);
      }
    } catch (error) {
      console.error('❌ Error processing learning queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async handleSingleEvent(event: LearningEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'message_sent':
          await this.handleMessageSent(event);
          break;
        case 'response_received':
          await this.handleResponseReceived(event);
          break;
        case 'feedback_submitted':
          await this.handleFeedbackSubmitted(event);
          break;
        case 'appointment_booked':
          await this.handleAppointmentBooked(event);
          break;
        case 'conversation_analyzed':
          await this.handleConversationAnalyzed(event);
          break;
      }
      
      // Update learning metrics
      await this.updateLearningMetrics(event);
      
    } catch (error) {
      console.error(`❌ Error handling learning event ${event.type}:`, error);
    }
  }

  private async handleMessageSent(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    // Track template usage
    if (data.content) {
      await supabase
        .from('ai_template_performance')
        .upsert({
          template_content: data.content,
          template_variant: 'default',
          usage_count: 1,
          last_used_at: event.timestamp.toISOString()
        }, {
          onConflict: 'template_content,template_variant',
          ignoreDuplicates: false
        });
    }

    // Update lead response patterns
    await this.updateLeadResponsePatterns(leadId, {
      last_interaction_type: 'message_sent',
      message_content: data.content
    });
  }

  private async handleResponseReceived(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    // Update response patterns
    await this.updateLeadResponsePatterns(leadId, {
      total_responses: 1,
      response_time_hours: data.responseTimeHours || 0,
      last_response_at: event.timestamp.toISOString()
    });

    // Track learning outcome
    await aiLearningService.trackLearningOutcome({
      leadId,
      outcomeType: 'response_received',
      messageCharacteristics: {
        responseTime: data.responseTimeHours,
        messageLength: data.messageLength
      }
    });
  }

  private async handleFeedbackSubmitted(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    // Submit feedback through learning service
    await aiLearningService.submitMessageFeedback({
      leadId,
      messageContent: data.messageContent,
      feedbackType: data.feedbackType,
      rating: data.rating,
      improvementSuggestions: data.suggestions
    });

    // Generate insights based on feedback
    await this.generateFeedbackInsights(leadId, data);
  }

  private async handleAppointmentBooked(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    await aiLearningService.trackLearningOutcome({
      leadId,
      outcomeType: 'appointment_booked',
      outcomeValue: 1,
      leadCharacteristics: data.leadCharacteristics
    });

    // Generate high-impact insight
    await this.createLearningInsight({
      type: 'performance',
      title: 'Appointment Booked',
      description: 'Lead successfully converted to appointment',
      confidence: 0.95,
      impact: 'high',
      actionable: true,
      leadId,
      data: { appointmentType: data.appointmentType }
    });
  }

  private async handleConversationAnalyzed(event: LearningEvent): Promise<void> {
    const { leadId, data } = event;
    
    // Create analysis insights
    if (data.insights) {
      for (const insight of data.insights) {
        await this.createLearningInsight({
          type: 'pattern',
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          impact: insight.impact,
          actionable: insight.actionable,
          leadId,
          data: insight.data
        });
      }
    }
  }

  private async updateLeadResponsePatterns(leadId: string, updates: any): Promise<void> {
    try {
      await supabase
        .from('lead_response_patterns')
        .upsert({
          lead_id: leadId,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lead_id'
        });
    } catch (error) {
      console.error('❌ Error updating lead response patterns:', error);
    }
  }

  private async createLearningInsight(insight: Omit<OptimizationInsight, 'id'>): Promise<void> {
    try {
      await supabase
        .from('ai_learning_insights')
        .insert({
          insight_type: insight.type,
          insight_title: insight.title,
          insight_description: insight.description,
          confidence_score: insight.confidence,
          impact_level: insight.impact,
          actionable: insight.actionable,
          lead_id: insight.leadId,
          insight_data: insight.data || {},
          applies_globally: !insight.leadId
        });
    } catch (error) {
      console.error('❌ Error creating learning insight:', error);
    }
  }

  private async generateFeedbackInsights(leadId: string, feedbackData: any): Promise<void> {
    // Generate insights based on feedback patterns
    if (feedbackData.feedbackType === 'negative' && feedbackData.rating <= 2) {
      await this.createLearningInsight({
        type: 'optimization',
        title: 'Message Quality Issue Detected',
        description: `Low-rated message needs improvement: ${feedbackData.suggestions || 'No specific suggestions provided'}`,
        confidence: 0.8,
        impact: 'medium',
        actionable: true,
        leadId,
        data: { 
          originalMessage: feedbackData.messageContent,
          rating: feedbackData.rating,
          suggestions: feedbackData.suggestions
        }
      });
    }

    if (feedbackData.feedbackType === 'positive' && feedbackData.rating >= 4) {
      await this.createLearningInsight({
        type: 'pattern',
        title: 'High-Performing Message Pattern',
        description: 'Message received positive feedback and should be used as template',
        confidence: 0.9,
        impact: 'medium',
        actionable: true,
        leadId,
        data: {
          successfulMessage: feedbackData.messageContent,
          rating: feedbackData.rating
        }
      });
    }
  }

  private async updateLearningMetrics(event: LearningEvent): Promise<void> {
    try {
      // Get today's metrics
      const { data: todayMetrics } = await supabase
        .from('ai_learning_metrics')
        .select('*')
        .eq('metric_date', new Date().toISOString().split('T')[0])
        .single();

      const updates: any = {
        learning_events_processed: (todayMetrics?.learning_events_processed || 0) + 1
      };

      if (event.type === 'message_sent') {
        updates.total_interactions = (todayMetrics?.total_interactions || 0) + 1;
      }

      if (event.type === 'feedback_submitted' && event.data.feedbackType === 'positive') {
        updates.successful_interactions = (todayMetrics?.successful_interactions || 0) + 1;
      }

      if (event.type === 'appointment_booked') {
        updates.optimization_triggers = (todayMetrics?.optimization_triggers || 0) + 1;
      }

      await supabase
        .from('ai_learning_metrics')
        .upsert({
          metric_date: new Date().toISOString().split('T')[0],
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'metric_date'
        });
    } catch (error) {
      console.error('❌ Error updating learning metrics:', error);
    }
  }

  async getOptimizationInsights(leadId?: string): Promise<{
    insights: OptimizationInsight[];
    activeOptimizations: any[];
    learningMetrics: any;
  }> {
    try {
      // Get insights
      let insightsQuery = supabase
        .from('ai_learning_insights')
        .select('*')
        .eq('actionable', true)
        .order('confidence_score', { ascending: false })
        .limit(10);

      if (leadId) {
        insightsQuery = insightsQuery.or(`lead_id.eq.${leadId},applies_globally.eq.true`);
      }

      const { data: insightsData } = await insightsQuery;

      // Get active optimizations
      const { data: optimizationsData } = await supabase
        .from('ai_template_performance')
        .select('*')
        .gt('usage_count', 0)
        .order('performance_score', { ascending: false })
        .limit(5);

      // Get learning metrics
      const { data: metricsData } = await supabase
        .from('ai_learning_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(7);

      const insights: OptimizationInsight[] = (insightsData || []).map(insight => ({
        id: insight.id,
        type: insight.insight_type,
        title: insight.insight_title,
        description: insight.insight_description,
        confidence: insight.confidence_score,
        impact: insight.impact_level,
        actionable: insight.actionable,
        leadId: insight.lead_id,
        data: insight.insight_data
      }));

      return {
        insights,
        activeOptimizations: optimizationsData || [],
        learningMetrics: metricsData || []
      };
    } catch (error) {
      console.error('❌ Error getting optimization insights:', error);
      return {
        insights: [],
        activeOptimizations: [],
        learningMetrics: []
      };
    }
  }

  async getLeadLearningProfile(leadId: string): Promise<any> {
    try {
      const [responsePatterns, insights, outcomes] = await Promise.all([
        supabase
          .from('lead_response_patterns')
          .select('*')
          .eq('lead_id', leadId)
          .single(),
        supabase
          .from('ai_learning_insights')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('ai_learning_outcomes')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      return {
        responsePatterns: responsePatterns.data,
        insights: insights.data || [],
        outcomes: outcomes.data || []
      };
    } catch (error) {
      console.error('❌ Error getting lead learning profile:', error);
      return {
        responsePatterns: null,
        insights: [],
        outcomes: []
      };
    }
  }
}

export const realtimeLearningService = new RealtimeLearningService();
