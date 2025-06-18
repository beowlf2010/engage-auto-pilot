
import { supabase } from '@/integrations/supabase/client';

export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    console.log(`🎯 Generating enhanced AI message for lead ${leadId}`);
    
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return null;
    }

    // Get recent conversations to avoid repetition
    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('body, direction')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(5);

    const firstName = lead.first_name || 'there';
    const vehicleInterest = lead.vehicle_interest || 'a vehicle';
    const messagesSent = lead.ai_messages_sent || 0;
    const stage = lead.ai_stage || 'day_1_morning';

    console.log(`📋 Lead info: ${firstName}, Stage: ${stage}, Messages sent: ${messagesSent}`);

    // Generate message based on stage and message count
    let message = '';

    if (stage.includes('day_1') || messagesSent === 0) {
      message = `Hi ${firstName}! I'm Finn from the dealership. I see you're interested in ${vehicleInterest}. I'd love to help you find the perfect match! Any specific features you're looking for?`;
    } else if (stage.includes('day_2') || messagesSent === 1) {
      message = `Hey ${firstName}! Following up on ${vehicleInterest}. We have some great options available. Would you like to see what we have in stock?`;
    } else if (stage.includes('day_3') || messagesSent === 2) {
      message = `Hi ${firstName}! Hope you're doing well. Still thinking about ${vehicleInterest}? I'm here if you have any questions or want to schedule a test drive!`;
    } else if (stage.includes('week_1') || messagesSent >= 3) {
      message = `${firstName}, just wanted to check in about ${vehicleInterest}. No pressure - I'm here whenever you're ready to move forward!`;
    } else {
      // Fallback message
      message = `Hi ${firstName}! Hope you're having a great day. Any updates on your ${vehicleInterest} search? I'm here to help!`;
    }

    // Avoid sending duplicate messages
    const recentBodies = recentMessages?.map(m => m.body.toLowerCase()) || [];
    if (recentBodies.some(body => body.includes(message.toLowerCase().substring(0, 20)))) {
      // Generate alternative message
      message = `${firstName}, hope you're doing well! Wanted to follow up about ${vehicleInterest}. What questions can I answer for you?`;
    }

    console.log(`✅ Generated message: "${message}"`);
    return message;

  } catch (error) {
    console.error('Error generating enhanced AI message:', error);
    return null;
  }
};

export const scheduleEnhancedAIMessages = async (leadId: string): Promise<void> => {
  try {
    console.log(`📅 Scheduling next AI message for lead ${leadId}`);
    
    // Get lead data
    const { data: lead, error } = await supabase
      .from('leads')
      .select('created_at, ai_messages_sent, ai_stage')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      console.error('Error fetching lead for scheduling:', error);
      return;
    }

    const messagesSent = lead.ai_messages_sent || 0;
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine next stage and delay
    let nextStage = 'day_1_morning';
    let delayHours = 24; // Default 24 hours

    if (messagesSent === 0) {
      nextStage = 'day_2_followup';
      delayHours = 24;
    } else if (messagesSent === 1) {
      nextStage = 'day_3_followup';
      delayHours = 24;
    } else if (messagesSent === 2) {
      nextStage = 'week_1_followup';
      delayHours = 96; // 4 days
    } else if (messagesSent >= 3) {
      nextStage = 'week_2_followup';
      delayHours = 168; // 7 days
    }

    // Calculate next send time
    const nextSendTime = new Date();
    nextSendTime.setHours(nextSendTime.getHours() + delayHours);

    // Don't schedule too many messages
    if (messagesSent >= 5) {
      console.log(`🛑 Not scheduling more messages for lead ${leadId} - already sent ${messagesSent}`);
      await supabase
        .from('leads')
        .update({
          next_ai_send_at: null,
          ai_sequence_paused: true,
          ai_pause_reason: 'max_messages_reached'
        })
        .eq('id', leadId);
      return;
    }

    // Update lead with next stage and send time
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_stage: nextStage,
        next_ai_send_at: nextSendTime.toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error scheduling next AI message:', updateError);
      return;
    }

    console.log(`📅 Scheduled next AI message for ${nextSendTime.toISOString()}, stage: ${nextStage}`);

  } catch (error) {
    console.error('Error scheduling enhanced AI messages:', error);
  }
};

export const resumePausedSequences = async (): Promise<void> => {
  try {
    const now = new Date();
    
    const { data: leadsToResume } = await supabase
      .from('leads')
      .select('id, first_name, last_name')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', true)
      .not('ai_resume_at', 'is', null)
      .lte('ai_resume_at', now.toISOString());

    console.log(`🔄 Resuming ${leadsToResume?.length || 0} paused sequences`);

    for (const lead of leadsToResume || []) {
      await supabase
        .from('leads')
        .update({
          ai_sequence_paused: false,
          ai_pause_reason: null,
          ai_resume_at: null
        })
        .eq('id', lead.id);

      await scheduleEnhancedAIMessages(lead.id);
      console.log(`▶️ Resumed AI sequence for ${lead.first_name} ${lead.last_name}`);
    }
  } catch (error) {
    console.error('Error resuming paused sequences:', error);
  }
};

export const trackLeadResponse = async (leadId: string, responseTime: Date): Promise<void> => {
  try {
    console.log(`📊 Tracking lead response for lead ${leadId}`);
    
    await supabase
      .from('leads')
      .update({
        last_response_at: responseTime.toISOString(),
        pending_human_response: true,
        ai_sequence_paused: true,
        ai_pause_reason: 'customer_responded'
      })
      .eq('id', leadId);

    console.log(`✅ Tracked response for lead ${leadId}`);
  } catch (error) {
    console.error('Error tracking lead response:', error);
  }
};

export const getAIAnalyticsDashboard = async () => {
  try {
    // Get basic AI stats
    const { data: leads } = await supabase
      .from('leads')
      .select('ai_messages_sent, created_at')
      .eq('ai_opt_in', true);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('direction, created_at')
      .eq('ai_generated', true);

    const { data: responses } = await supabase
      .from('conversations')
      .select('lead_id, direction')
      .eq('direction', 'in');

    const totalMessagesSent = conversations?.length || 0;
    const totalResponses = responses?.length || 0;
    const overallResponseRate = totalMessagesSent > 0 ? totalResponses / totalMessagesSent : 0;
    const averageMessagesPerLead = leads?.length > 0 ? 
      (leads.reduce((sum, lead) => sum + (lead.ai_messages_sent || 0), 0) / leads.length) : 0;

    return {
      totalMessagesSent,
      totalResponses,
      overallResponseRate,
      averageMessagesPerLead
    };
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return {
      totalMessagesSent: 0,
      totalResponses: 0,
      overallResponseRate: 0,
      averageMessagesPerLead: 0
    };
  }
};
