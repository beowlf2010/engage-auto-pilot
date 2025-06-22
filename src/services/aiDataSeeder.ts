import { supabase } from '@/integrations/supabase/client';

export class AIDataSeeder {
  
  async seedLearningData() {
    console.log('🌱 [AI DATA SEEDER] Starting to populate AI learning data...');
    
    try {
      // Get some recent leads and conversations for realistic data
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, lead_id, body, direction, ai_generated, sent_at')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (!leads || !conversations) {
        throw new Error('No leads or conversations found to seed data');
      }

      // 1. Populate AI Message Feedback
      await this.seedMessageFeedback(conversations);
      
      // 2. Populate AI Learning Insights
      await this.seedLearningInsights(leads);
      
      // 3. Populate AI Template Performance
      await this.seedTemplatePerformance();
      
      // 4. Populate Learning Outcomes
      await this.seedLearningOutcomes(leads, conversations);
      
      console.log('✅ [AI DATA SEEDER] Successfully populated all AI learning data');
      return { success: true, message: 'AI learning data populated successfully' };
      
    } catch (error) {
      console.error('❌ [AI DATA SEEDER] Error seeding data:', error);
      throw error;
    }
  }

  private async seedMessageFeedback(conversations: any[]) {
    const feedbackData = conversations
      .filter(c => c.ai_generated)
      .map(conv => ({
        lead_id: conv.lead_id,
        conversation_id: conv.id,
        message_content: conv.body,
        feedback_type: Math.random() > 0.3 ? 'positive' : Math.random() > 0.5 ? 'neutral' : 'negative',
        rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
        response_received: Math.random() > 0.4,
        response_time_hours: Math.random() * 24,
        conversion_outcome: Math.random() > 0.7 ? 'positive_response' : 'no_action'
      }));

    if (feedbackData.length > 0) {
      await supabase.from('ai_message_feedback').upsert(feedbackData);
      console.log(`📊 [AI DATA SEEDER] Added ${feedbackData.length} message feedback entries`);
    }
  }

  private async seedLearningInsights(leads: any[]) {
    const insights = [
      {
        insight_type: 'response_timing',
        insight_title: 'Optimal Response Time Detected',
        insight_description: 'Messages sent between 2-4 PM have 35% higher response rates',
        impact_level: 'high',
        confidence_score: 0.85,
        actionable: true,
        applies_globally: true,
        insight_data: {
          optimal_hours: [14, 15, 16],
          response_rate_improvement: 0.35,
          sample_size: 247
        }
      },
      {
        insight_type: 'message_length',
        insight_title: 'Short Messages Perform Better',
        insight_description: 'Messages under 50 characters get 42% more responses',
        impact_level: 'medium',
        confidence_score: 0.78,
        actionable: true,
        applies_globally: true,
        insight_data: {
          optimal_length: 45,
          response_rate_improvement: 0.42,
          sample_size: 156
        }
      },
      {
        insight_type: 'follow_up_timing',
        insight_title: 'Follow-up Timing Insight',
        insight_description: 'Second follow-up after 3 days increases engagement by 28%',
        impact_level: 'medium',
        confidence_score: 0.72,
        actionable: true,
        applies_globally: true,
        insight_data: {
          optimal_delay_days: 3,
          engagement_increase: 0.28,
          conversion_rate: 0.15
        }
      }
    ];

    // Add lead-specific insights with matching type structure
    if (leads.length > 0) {
      insights.push({
        lead_id: leads[0].id,
        insight_type: 'personalization',
        insight_title: `${leads[0].first_name} Prefers Direct Communication`,
        insight_description: 'This lead responds better to direct questions and specific vehicle details',
        impact_level: 'high',
        confidence_score: 0.91,
        actionable: true,
        applies_globally: false,
        insight_data: {
          optimal_length: 60,
          response_rate_improvement: 0.73,
          sample_size: 12
        }
      });
    }

    await supabase.from('ai_learning_insights').upsert(insights);
    console.log(`💡 [AI DATA SEEDER] Added ${insights.length} learning insights`);
  }

  private async seedTemplatePerformance() {
    const templates = [
      {
        template_content: "Hi {name}! I wanted to follow up on your interest in the {vehicle}. Do you have any questions I can help answer?",
        template_variant: "follow_up_v1",
        usage_count: 45,
        response_count: 23,
        positive_responses: 18,
        conversion_count: 8,
        performance_score: 0.73,
        lead_segment: "new_inquiry"
      },
      {
        template_content: "Hello {name}, I have some great news about the {vehicle} you were interested in. Would you like to hear more?",
        template_variant: "good_news_v1",
        usage_count: 32,
        response_count: 19,
        positive_responses: 16,
        conversion_count: 12,
        performance_score: 0.81,
        lead_segment: "warm_lead"
      },
      {
        template_content: "Hi {name}! Just checking in to see if you have any questions about the {vehicle}. I'm here to help!",
        template_variant: "check_in_v1",
        usage_count: 67,
        response_count: 28,
        positive_responses: 21,
        conversion_count: 9,
        performance_score: 0.65,
        lead_segment: "cold_lead"
      }
    ];

    await supabase.from('ai_template_performance').upsert(templates);
    console.log(`📝 [AI DATA SEEDER] Added ${templates.length} template performance records`);
  }

  private async seedLearningOutcomes(leads: any[], conversations: any[]) {
    const outcomes = conversations
      .filter(c => c.ai_generated)
      .slice(0, 8)
      .map(conv => ({
        lead_id: conv.lead_id,
        message_id: conv.id,
        outcome_type: Math.random() > 0.6 ? 'positive_response' : 
                     Math.random() > 0.3 ? 'response_received' : 'no_response',
        days_to_outcome: Math.floor(Math.random() * 7) + 1,
        message_characteristics: {
          message_length: conv.body.length,
          sent_hour: new Date(conv.sent_at).getHours(),
          message_type: 'follow_up'
        },
        lead_characteristics: {
          lead_age_days: Math.floor(Math.random() * 30) + 1,
          previous_interactions: Math.floor(Math.random() * 5) + 1
        },
        seasonal_context: {
          hour: new Date(conv.sent_at).getHours(),
          day_of_week: new Date(conv.sent_at).getDay(),
          month: new Date(conv.sent_at).getMonth()
        }
      }));

    if (outcomes.length > 0) {
      await supabase.from('ai_learning_outcomes').upsert(outcomes);
      console.log(`🎯 [AI DATA SEEDER] Added ${outcomes.length} learning outcomes`);
    }
  }

  async seedDailyMetrics() {
    const metrics = {
      metric_date: new Date().toISOString().split('T')[0],
      total_interactions: 67,
      successful_interactions: 43,
      learning_events_processed: 28,
      optimization_triggers: 12,
      template_improvements: 5,
      average_confidence_score: 4.2,
      response_rate_improvement: 0.15
    };

    await supabase.from('ai_learning_metrics').upsert(metrics);
    console.log('📈 [AI DATA SEEDER] Added daily metrics');
  }
}

export const aiDataSeeder = new AIDataSeeder();
