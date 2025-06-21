
import { supabase } from '@/integrations/supabase/client';

export class LearningDataBackfillService {
  
  // Backfill historical learning data from existing conversations
  async backfillHistoricalData(limit: number = 100) {
    console.log('🔄 [BACKFILL] Starting historical learning data backfill');
    
    try {
      // Get AI-generated outbound messages with their replies
      const { data: aiMessages, error } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          body,
          sent_at,
          ai_generated,
          leads (
            id,
            first_name,
            last_name
          )
        `)
        .eq('direction', 'out')
        .eq('ai_generated', true)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log(`📊 [BACKFILL] Found ${aiMessages?.length || 0} AI messages to process`);

      let processedCount = 0;
      let responsesFound = 0;

      for (const message of aiMessages || []) {
        try {
          // Find replies to this message (within 48 hours)
          const cutoffTime = new Date(new Date(message.sent_at).getTime() + 48 * 60 * 60 * 1000);
          
          const { data: replies } = await supabase
            .from('conversations')
            .select('*')
            .eq('lead_id', message.lead_id)
            .eq('direction', 'in')
            .gte('sent_at', message.sent_at)
            .lt('sent_at', cutoffTime.toISOString())
            .order('sent_at', { ascending: true })
            .limit(1);

          const hasReply = replies && replies.length > 0;
          const firstReply = hasReply ? replies[0] : null;
          
          if (hasReply) {
            responsesFound++;
            
            const responseTimeHours = firstReply 
              ? (new Date(firstReply.sent_at).getTime() - new Date(message.sent_at).getTime()) / (1000 * 60 * 60)
              : null;

            // Determine outcome type from reply content
            let outcomeType = 'response_received';
            if (firstReply) {
              const lowerReply = firstReply.body.toLowerCase();
              if (lowerReply.includes('stop') || lowerReply.includes('unsubscribe')) {
                outcomeType = 'opt_out';
              } else if (lowerReply.includes('yes') || lowerReply.includes('interested') || lowerReply.includes('appointment')) {
                outcomeType = 'positive_response';
              } else if (lowerReply.includes('no') || lowerReply.includes('not interested')) {
                outcomeType = 'negative_response';
              }
            }

            // Check if learning outcome already exists
            const { data: existingOutcome } = await supabase
              .from('ai_learning_outcomes')
              .select('id')
              .eq('lead_id', message.lead_id)
              .eq('message_id', message.id)
              .single();

            if (!existingOutcome) {
              // Record learning outcome
              await supabase.from('ai_learning_outcomes').insert({
                lead_id: message.lead_id,
                message_id: message.id,
                outcome_type: outcomeType,
                days_to_outcome: responseTimeHours ? Math.ceil(responseTimeHours / 24) : 1,
                message_characteristics: {
                  message_content: message.body,
                  message_length: message.body.length,
                  sent_hour: new Date(message.sent_at).getHours(),
                  response_time_hours: responseTimeHours
                },
                lead_characteristics: firstReply ? {
                  reply_content: firstReply.body,
                  reply_length: firstReply.body.length,
                  reply_sentiment: outcomeType
                } : {},
                seasonal_context: {
                  hour: new Date(message.sent_at).getHours(),
                  day_of_week: new Date(message.sent_at).getDay(),
                  month: new Date(message.sent_at).getMonth()
                }
              });
            }

            // Check if feedback already exists
            const { data: existingFeedback } = await supabase
              .from('ai_message_feedback')
              .select('id')
              .eq('lead_id', message.lead_id)
              .eq('conversation_id', message.id)
              .single();

            if (!existingFeedback) {
              // Record message feedback
              await supabase.from('ai_message_feedback').insert({
                lead_id: message.lead_id,
                conversation_id: message.id,
                message_content: message.body,
                feedback_type: outcomeType.includes('positive') ? 'positive' : 
                              outcomeType.includes('negative') ? 'negative' : 'neutral',
                response_received: true,
                response_time_hours: responseTimeHours,
                conversion_outcome: outcomeType
              });
            }

            // Check if analytics already exists
            const { data: existingAnalytics } = await supabase
              .from('ai_message_analytics')
              .select('id')
              .eq('lead_id', message.lead_id)
              .eq('message_content', message.body)
              .eq('sent_at', message.sent_at)
              .single();

            if (!existingAnalytics) {
              // Record message analytics
              await supabase.from('ai_message_analytics').insert({
                lead_id: message.lead_id,
                message_content: message.body,
                message_stage: 'follow_up',
                sent_at: message.sent_at,
                responded_at: firstReply?.sent_at || null,
                response_time_hours: responseTimeHours,
                hour_of_day: new Date(message.sent_at).getHours(),
                day_of_week: new Date(message.sent_at).getDay()
              });
            }
          } else {
            // No reply - record as no response
            const { data: existingOutcome } = await supabase
              .from('ai_learning_outcomes')
              .select('id')
              .eq('lead_id', message.lead_id)
              .eq('message_id', message.id)
              .single();

            if (!existingOutcome) {
              await supabase.from('ai_learning_outcomes').insert({
                lead_id: message.lead_id,
                message_id: message.id,
                outcome_type: 'no_response',
                days_to_outcome: null,
                message_characteristics: {
                  message_content: message.body,
                  message_length: message.body.length,
                  sent_hour: new Date(message.sent_at).getHours()
                },
                seasonal_context: {
                  hour: new Date(message.sent_at).getHours(),
                  day_of_week: new Date(message.sent_at).getDay(),
                  month: new Date(message.sent_at).getMonth()
                }
              });
            }
          }

          processedCount++;
          
          if (processedCount % 10 === 0) {
            console.log(`📊 [BACKFILL] Processed ${processedCount}/${aiMessages?.length || 0} messages`);
          }

        } catch (error) {
          console.error(`❌ [BACKFILL] Error processing message ${message.id}:`, error);
        }
      }

      console.log(`✅ [BACKFILL] Complete! Processed ${processedCount} messages, found ${responsesFound} responses`);
      
      return {
        processed: processedCount,
        responses: responsesFound,
        success: true
      };

    } catch (error) {
      console.error('❌ [BACKFILL] Error in backfill process:', error);
      throw error;
    }
  }

  // Update template performance based on historical data
  async updateTemplatePerformance() {
    console.log('🔄 [BACKFILL] Updating template performance');
    
    try {
      // Get all AI messages with their outcomes
      const { data: messageOutcomes } = await supabase
        .from('ai_learning_outcomes')
        .select(`
          message_characteristics,
          outcome_type,
          lead_id
        `);

      // Group by message content and calculate performance
      const templatePerformance = new Map();

      for (const outcome of messageOutcomes || []) {
        const messageContent = outcome.message_characteristics?.message_content;
        if (!messageContent) continue;

        if (!templatePerformance.has(messageContent)) {
          templatePerformance.set(messageContent, {
            usage_count: 0,
            response_count: 0,
            positive_responses: 0,
            conversion_count: 0
          });
        }

        const stats = templatePerformance.get(messageContent);
        stats.usage_count++;
        
        if (['response_received', 'positive_response', 'negative_response'].includes(outcome.outcome_type)) {
          stats.response_count++;
        }
        
        if (outcome.outcome_type === 'positive_response') {
          stats.positive_responses++;
          stats.conversion_count++;
        }
      }

      // Update template performance records
      for (const [content, stats] of templatePerformance) {
        const responseRate = stats.usage_count > 0 ? stats.response_count / stats.usage_count : 0;
        const conversionRate = stats.usage_count > 0 ? stats.conversion_count / stats.usage_count : 0;
        const performanceScore = (responseRate * 0.6) + (conversionRate * 0.4);

        await supabase.from('ai_template_performance').upsert({
          template_content: content,
          template_variant: 'default',
          usage_count: stats.usage_count,
          response_count: stats.response_count,
          positive_responses: stats.positive_responses,
          conversion_count: stats.conversion_count,
          response_rate: responseRate,
          conversion_rate: conversionRate,
          performance_score: performanceScore,
          last_used_at: new Date().toISOString()
        });
      }

      console.log(`✅ [BACKFILL] Updated performance for ${templatePerformance.size} templates`);
      
    } catch (error) {
      console.error('❌ [BACKFILL] Error updating template performance:', error);
      throw error;
    }
  }
}

export const learningBackfillService = new LearningDataBackfillService();
