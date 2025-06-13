import { supabase } from '@/integrations/supabase/client';
import { 
  generateIntelligentAIMessage, 
  shouldSendMessage, 
  generateContextualMessage 
} from './intelligentAIMessageService';

// Enhanced AI message generation that uses true AI instead of templates
export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    // Check quality controls first
    const canSend = await shouldSendMessage(leadId);
    if (!canSend) {
      console.log(`Quality controls prevented message for lead ${leadId}`);
      return null;
    }

    // Generate truly unique AI message
    const message = await generateIntelligentAIMessage({ leadId });
    
    if (!message) return null;

    // Update message count
    const { data: currentLead } = await supabase
      .from('leads')
      .select('ai_messages_sent')
      .eq('id', leadId)
      .single();

    const currentCount = currentLead?.ai_messages_sent || 0;
    
    await supabase
      .from('leads')
      .update({
        ai_messages_sent: currentCount + 1,
        ai_last_message_stage: 'intelligent_ai'
      })
      .eq('id', leadId);

    return message;
  } catch (error) {
    console.error('Error in enhanced AI message generation:', error);
    return null;
  }
};

// Enhanced scheduling with intelligent timing
export const scheduleEnhancedAIMessages = async (leadId: string): Promise<void> => {
  try {
    // Get current lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_messages_sent, created_at, last_reply_at')
      .eq('id', leadId)
      .single();

    if (!lead) return;

    // Intelligent scheduling based on engagement
    const messagesSent = lead.ai_messages_sent || 0;
    const hasReplied = !!lead.last_reply_at;
    
    let nextSendDelay: number;

    if (messagesSent === 0) {
      // First message - send within 15 minutes
      nextSendDelay = 15 * 60 * 1000;
    } else if (hasReplied) {
      // Lead has responded - more aggressive follow-up (4 hours)
      nextSendDelay = 4 * 60 * 60 * 1000;
    } else if (messagesSent < 3) {
      // Early stage - daily messages
      nextSendDelay = 24 * 60 * 60 * 1000;
    } else if (messagesSent < 7) {
      // Mid stage - every 2 days
      nextSendDelay = 2 * 24 * 60 * 60 * 1000;
    } else {
      // Later stage - weekly
      nextSendDelay = 7 * 24 * 60 * 60 * 1000;
    }

    // Ensure we schedule during business hours
    const nextSendAt = new Date(Date.now() + nextSendDelay);
    const adjustedSendTime = adjustToBusinessHours(nextSendAt);

    await supabase
      .from('leads')
      .update({
        next_ai_send_at: adjustedSendTime.toISOString()
      })
      .eq('id', leadId);

    console.log(`Scheduled next intelligent message for lead ${leadId} at ${adjustedSendTime}`);
  } catch (error) {
    console.error('Error scheduling enhanced AI messages:', error);
  }
};

// Adjust scheduling to business hours (9 AM - 6 PM)
function adjustToBusinessHours(date: Date): Date {
  const adjusted = new Date(date);
  const hour = adjusted.getHours();
  
  if (hour < 9) {
    adjusted.setHours(9, 0, 0, 0);
  } else if (hour >= 18) {
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(9, 0, 0, 0);
  }
  
  // Skip weekends
  const dayOfWeek = adjusted.getDay();
  if (dayOfWeek === 0) { // Sunday
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(9, 0, 0, 0);
  } else if (dayOfWeek === 6) { // Saturday
    adjusted.setDate(adjusted.getDate() + 2);
    adjusted.setHours(9, 0, 0, 0);
  }
  
  return adjusted;
}

// Track when a lead responds to update analytics and pause sequence
export const trackLeadResponse = async (leadId: string, responseTime?: Date): Promise<void> => {
  try {
    const responseDateTime = responseTime || new Date();
    
    // Update lead with response information
    await supabase
      .from('leads')
      .update({
        last_reply_at: responseDateTime.toISOString(),
        ai_sequence_paused: true,
        ai_pause_reason: 'lead_responded',
        ai_resume_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Resume after 24 hours
      })
      .eq('id', leadId);

    // Update conversation context
    await supabase
      .from('ai_conversation_context')
      .upsert({
        lead_id: leadId,
        last_interaction_type: 'lead_response',
        response_style: 'engaged',
        updated_at: new Date().toISOString()
      });

    console.log(`Tracked response for lead ${leadId}, paused sequence for 24 hours`);
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

      // Schedule next intelligent message
      await scheduleEnhancedAIMessages(lead.id);
    }

    if (leadsToResume?.length) {
      console.log(`Resumed ${leadsToResume.length} paused sequences`);
    }
  } catch (error) {
    console.error('Error resuming paused sequences:', error);
  }
};

// Enhanced message generation with behavioral triggers
export const generateBehavioralMessage = async (
  leadId: string, 
  behavioralTrigger: {
    trigger_type: string;
    trigger_data: any;
  }
): Promise<string | null> => {
  try {
    // Check quality controls
    const canSend = await shouldSendMessage(leadId);
    if (!canSend) {
      return null;
    }

    // Generate contextual message based on behavior
    const message = await generateContextualMessage(leadId, behavioralTrigger);
    
    if (message) {
      // Update trigger as processed
      await supabase
        .from('lead_behavior_triggers')
        .update({ 
          is_processed: true, 
          message_sent: true 
        })
        .eq('lead_id', leadId)
        .eq('trigger_type', behavioralTrigger.trigger_type);
    }

    return message;
  } catch (error) {
    console.error('Error generating behavioral message:', error);
    return null;
  }
};

// Get AI analytics dashboard data
export const getAIAnalyticsDashboard = async () => {
  try {
    // Get message history stats
    const { data: messageStats } = await supabase
      .from('ai_message_history')
      .select('lead_id, sent_at');

    // Get conversation stats
    const { data: conversationStats } = await supabase
      .from('conversations')
      .select('lead_id, direction, ai_generated')
      .eq('ai_generated', true);

    // Get response data
    const { data: responseData } = await supabase
      .from('leads')
      .select('id, last_reply_at, ai_messages_sent');

    const totalMessagesSent = messageStats?.length || 0;
    const leadsWithResponses = responseData?.filter(l => l.last_reply_at).length || 0;
    const overallResponseRate = totalMessagesSent > 0 ? leadsWithResponses / totalMessagesSent : 0;

    return {
      totalMessagesSent,
      totalResponses: leadsWithResponses,
      overallResponseRate,
      uniqueMessagesGenerated: totalMessagesSent, // All messages are unique now
      averageMessagesPerLead: responseData?.length ? totalMessagesSent / responseData.length : 0
    };
  } catch (error) {
    console.error('Error getting AI analytics:', error);
    return null;
  }
};
