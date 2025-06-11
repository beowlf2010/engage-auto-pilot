
import { supabase } from '@/integrations/supabase/client';
import { 
  generateAdvancedAIMessage, 
  generateNextScheduledMessages,
  updateTemplatePerformance,
  updateResponsePatterns
} from './advancedAIService';

// Enhanced AI message generation that replaces the old system
export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    const result = await generateAdvancedAIMessage(leadId);
    if (!result) return null;

    // Update message count and last stage
    await supabase
      .from('leads')
      .update({
        ai_messages_sent: supabase.sql`ai_messages_sent + 1`
      })
      .eq('id', leadId);

    return result.message;
  } catch (error) {
    console.error('Error in enhanced AI message generation:', error);
    return null;
  }
};

// Enhanced scheduling that replaces the old simple system
export const scheduleEnhancedAIMessages = async (leadId: string): Promise<void> => {
  try {
    await generateNextScheduledMessages(leadId);
  } catch (error) {
    console.error('Error scheduling enhanced AI messages:', error);
  }
};

// Track when a lead responds to update analytics
export const trackLeadResponse = async (leadId: string, responseTime?: Date): Promise<void> => {
  try {
    const responseDateTime = responseTime || new Date();
    
    // Update response patterns
    await updateResponsePatterns(leadId, responseDateTime);

    // Find recent messages sent to this lead to update template performance
    const { data: recentAnalytics } = await supabase
      .from('ai_message_analytics')
      .select('template_id, sent_at')
      .eq('lead_id', leadId)
      .is('responded_at', null)
      .order('sent_at', { ascending: false })
      .limit(5);

    // Mark the most recent message as responded to
    if (recentAnalytics && recentAnalytics.length > 0) {
      const latestMessage = recentAnalytics[0];
      
      // Calculate response time
      const sentAt = new Date(latestMessage.sent_at);
      const responseTimeHours = (responseDateTime.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

      // Update analytics record
      await supabase
        .from('ai_message_analytics')
        .update({
          responded_at: responseDateTime.toISOString(),
          response_time_hours: responseTimeHours
        })
        .eq('template_id', latestMessage.template_id)
        .eq('lead_id', leadId)
        .eq('sent_at', latestMessage.sent_at);

      // Update template performance
      await updateTemplatePerformance(latestMessage.template_id, true);
    }

    // Pause the AI sequence temporarily when lead responds
    await supabase
      .from('leads')
      .update({
        ai_sequence_paused: true,
        ai_pause_reason: 'lead_responded',
        ai_resume_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Resume after 24 hours
      })
      .eq('id', leadId);

  } catch (error) {
    console.error('Error tracking lead response:', error);
  }
};

// Resume AI sequence for leads that have been paused
export const resumePausedSequences = async (): Promise<void> => {
  try {
    const now = new Date();
    
    // Find leads that should resume
    const { data: leadsToResume } = await supabase
      .from('leads')
      .select('id')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', true)
      .not('ai_resume_at', 'is', null)
      .lte('ai_resume_at', now.toISOString());

    for (const lead of leadsToResume || []) {
      // Resume the sequence
      await supabase
        .from('leads')
        .update({
          ai_sequence_paused: false,
          ai_pause_reason: null,
          ai_resume_at: null
        })
        .eq('id', lead.id);

      // Schedule next messages
      await generateNextScheduledMessages(lead.id);
    }
  } catch (error) {
    console.error('Error resuming paused sequences:', error);
  }
};

// Get AI analytics dashboard data
export const getAIAnalyticsDashboard = async () => {
  try {
    // Get overall performance metrics
    const { data: overallStats } = await supabase
      .from('ai_message_analytics')
      .select('responded_at')
      .not('responded_at', 'is', null);

    const { data: totalMessages } = await supabase
      .from('ai_message_analytics')
      .select('id');

    // Get template performance
    const { data: templateStats } = await supabase
      .from('ai_message_templates')
      .select('stage, variant_name, response_rate, total_sent, total_responses')
      .eq('is_active', true)
      .order('response_rate', { ascending: false });

    // Get response time analytics
    const { data: responseTimeStats } = await supabase
      .from('ai_message_analytics')
      .select('response_time_hours, hour_of_day, day_of_week')
      .not('response_time_hours', 'is', null);

    return {
      totalMessagesSent: totalMessages?.length || 0,
      totalResponses: overallStats?.length || 0,
      overallResponseRate: totalMessages?.length ? (overallStats?.length || 0) / totalMessages.length : 0,
      templatePerformance: templateStats || [],
      responseTimeAnalytics: responseTimeStats || []
    };
  } catch (error) {
    console.error('Error getting AI analytics:', error);
    return null;
  }
};
