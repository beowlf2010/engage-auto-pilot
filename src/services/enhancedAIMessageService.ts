
import { supabase } from '@/integrations/supabase/client';
import { generateIntelligentAIMessage } from './intelligentAIMessageService';

export interface AIMessageSchedule {
  leadId: string;
  nextSendAt: string;
  stage: string;
  priority: 'low' | 'medium' | 'high';
  messageType: 'follow_up' | 'inventory_alert' | 'appointment_reminder' | 'behavioral_trigger';
}

export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    console.log('🤖 Generating enhanced AI message for lead:', leadId);
    
    // Use the existing intelligent AI message service
    const message = await generateIntelligentAIMessage({
      leadId,
      stage: 'enhanced_follow_up'
    });

    return message;
  } catch (error) {
    console.error('Error generating enhanced AI message:', error);
    return null;
  }
};

export const getAIAnalyticsDashboard = async () => {
  try {
    const { data: analytics } = await supabase
      .from('ai_message_analytics')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);

    return {
      totalMessages: analytics?.length || 0,
      responseRate: 0.65, // Mock data for now
      avgResponseTime: 2.4,
      topPerformingStages: ['initial', 'follow_up']
    };
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return null;
  }
};

export const scheduleEnhancedAIMessages = async (leadId: string): Promise<boolean> => {
  try {
    // Get lead information and conversation history
    const { data: lead } = await supabase
      .from('leads')
      .select(`
        *,
        conversations (direction, sent_at, body),
        lead_response_patterns (*),
        lead_personalities (*)
      `)
      .eq('id', leadId)
      .single();

    if (!lead || !lead.ai_opt_in || lead.ai_sequence_paused) {
      return false;
    }

    // Calculate next optimal send time based on response patterns
    const responsePattern = lead.lead_response_patterns?.[0];
    const personality = lead.lead_personalities?.[0];
    
    let nextSendTime = new Date();
    nextSendTime.setHours(nextSendTime.getHours() + 24); // Default to 24 hours

    // Optimize based on response patterns
    if (responsePattern?.best_response_hours && Array.isArray(responsePattern.best_response_hours) && responsePattern.best_response_hours.length > 0) {
      const bestHour = responsePattern.best_response_hours[0];
      nextSendTime.setHours(bestHour, 0, 0, 0);
      
      // If that time has passed today, schedule for tomorrow
      if (nextSendTime <= new Date()) {
        nextSendTime.setDate(nextSendTime.getDate() + 1);
      }
    }

    // Update lead with new schedule
    const { error } = await supabase
      .from('leads')
      .update({
        next_ai_send_at: nextSendTime.toISOString(),
        ai_stage: getNextAIStage(lead.ai_stage, lead.conversations?.length || 0)
      })
      .eq('id', leadId);

    if (error) throw error;

    console.log(`Scheduled next AI message for lead ${leadId} at ${nextSendTime}`);
    return true;
  } catch (error) {
    console.error('Error scheduling enhanced AI message:', error);
    return false;
  }
};

const getNextAIStage = (currentStage: string | null, messageCount: number): string => {
  if (!currentStage || currentStage === 'initial') {
    return messageCount < 3 ? 'initial_follow_up' : 'engagement';
  }
  
  switch (currentStage) {
    case 'initial_follow_up':
      return messageCount < 5 ? 'engagement' : 'nurture';
    case 'engagement':
      return messageCount < 8 ? 'nurture' : 'closing';
    case 'nurture':
      return 'closing';
    case 'closing':
      return 'long_term_follow_up';
    default:
      return 'follow_up';
  }
};

export const processQueuedMessages = async (): Promise<void> => {
  try {
    // Get all messages due for sending
    const { data: dueMessages } = await supabase
      .from('leads')
      .select('id, first_name, last_name, ai_stage')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', new Date().toISOString())
      .limit(50);

    if (!dueMessages?.length) {
      console.log('No messages due for sending');
      return;
    }

    console.log(`Processing ${dueMessages.length} due messages`);

    for (const lead of dueMessages) {
      try {
        // Generate AI message
        const message = await generateIntelligentAIMessage({
          leadId: lead.id,
          stage: lead.ai_stage || 'follow_up'
        });

        if (message) {
          // Store message for manual approval in queue
          await supabase
            .from('ai_message_analytics')
            .insert({
              lead_id: lead.id,
              message_content: message,
              message_stage: lead.ai_stage || 'follow_up',
              sent_at: new Date().toISOString()
            });

          console.log(`Generated message for ${lead.first_name} ${lead.last_name}`);
        }
      } catch (error) {
        console.error(`Error processing message for lead ${lead.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error processing queued messages:', error);
  }
};
