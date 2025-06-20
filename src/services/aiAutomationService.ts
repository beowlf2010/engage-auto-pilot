
import { supabase } from '@/integrations/supabase/client';

export const enableAIForLead = async (leadId: string): Promise<boolean> => {
  try {
    console.log(`🤖 [AI AUTOMATION] Enabling super aggressive AI for lead: ${leadId}`);
    
    // Calculate next AI send time - super aggressive (2-4 hours from now)
    const nextSendTime = new Date();
    const hoursToAdd = 2 + Math.random() * 2; // 2-4 hours
    nextSendTime.setTime(nextSendTime.getTime() + (hoursToAdd * 60 * 60 * 1000));
    
    console.log(`📅 [AI AUTOMATION] Next message scheduled for: ${nextSendTime.toLocaleString()}`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        ai_opt_in: true,
        ai_sequence_paused: false,
        ai_pause_reason: null,
        message_intensity: 'super_aggressive',
        ai_stage: 'initial',
        next_ai_send_at: nextSendTime.toISOString(),
        ai_messages_sent: 0,
        ai_enabled_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [AI AUTOMATION] Error enabling AI:', error);
      return false;
    }

    console.log('✅ [AI AUTOMATION] Super aggressive AI enabled successfully');
    return true;
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Exception enabling AI:', error);
    return false;
  }
};

export const pauseAIForLead = async (leadId: string, reason: string): Promise<boolean> => {
  try {
    console.log(`⏸️ [AI AUTOMATION] Pausing AI for lead: ${leadId}, reason: ${reason}`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        ai_sequence_paused: true,
        ai_pause_reason: reason,
        next_ai_send_at: null
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [AI AUTOMATION] Error pausing AI:', error);
      return false;
    }

    console.log('✅ [AI AUTOMATION] AI paused successfully');
    return true;
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Exception pausing AI:', error);
    return false;
  }
};

export const resumeAIForLead = async (leadId: string): Promise<boolean> => {
  try {
    console.log(`▶️ [AI AUTOMATION] Resuming AI for lead: ${leadId}`);
    
    // Calculate next send time when resuming
    const nextSendTime = new Date();
    const hoursToAdd = 2 + Math.random() * 2; // 2-4 hours from now
    nextSendTime.setTime(nextSendTime.getTime() + (hoursToAdd * 60 * 60 * 1000));
    
    const { error } = await supabase
      .from('leads')
      .update({
        ai_sequence_paused: false,
        ai_pause_reason: null,
        next_ai_send_at: nextSendTime.toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [AI AUTOMATION] Error resuming AI:', error);
      return false;
    }

    console.log('✅ [AI AUTOMATION] AI resumed successfully');
    return true;
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Exception resuming AI:', error);
    return false;
  }
};

export const scheduleNextAIMessage = async (leadId: string, currentStage?: string): Promise<boolean> => {
  try {
    console.log(`📅 [AI AUTOMATION] Scheduling next AI message for lead: ${leadId}`);
    
    // Get current lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_messages_sent, message_intensity, ai_stage')
      .eq('id', leadId)
      .single();

    if (!lead) {
      console.error('❌ [AI AUTOMATION] Lead not found');
      return false;
    }

    const messagesSent = lead.ai_messages_sent || 0;
    const intensity = lead.message_intensity || 'super_aggressive';
    
    // Calculate next send time based on intensity and message count
    const nextSendTime = new Date();
    let hoursToAdd = 24; // Default 24 hours
    
    switch (intensity) {
      case 'super_aggressive':
        if (messagesSent < 3) {
          hoursToAdd = 2 + Math.random() * 2; // 2-4 hours for first few messages
        } else if (messagesSent < 7) {
          hoursToAdd = 4 + Math.random() * 4; // 4-8 hours
        } else {
          hoursToAdd = 12 + Math.random() * 12; // 12-24 hours
        }
        break;
      case 'aggressive':
        hoursToAdd = 8 + Math.random() * 8; // 8-16 hours
        break;
      case 'moderate':
        hoursToAdd = 24 + Math.random() * 24; // 1-2 days
        break;
      default:
        hoursToAdd = 48 + Math.random() * 24; // 2-3 days
    }
    
    nextSendTime.setTime(nextSendTime.getTime() + (hoursToAdd * 60 * 60 * 1000));
    
    console.log(`📅 [AI AUTOMATION] Next message scheduled for: ${nextSendTime.toLocaleString()} (in ${hoursToAdd.toFixed(1)} hours)`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        next_ai_send_at: nextSendTime.toISOString(),
        ai_messages_sent: messagesSent + 1,
        ai_stage: currentStage || lead.ai_stage || 'follow_up'
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [AI AUTOMATION] Error scheduling next message:', error);
      return false;
    }

    console.log('✅ [AI AUTOMATION] Next message scheduled successfully');
    return true;
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Exception scheduling next message:', error);
    return false;
  }
};

export const getAIAutomationStatus = async () => {
  try {
    console.log('📊 [AI AUTOMATION] Getting automation status');
    
    // Get counts of pending messages
    const { count: pendingMessages } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', new Date().toISOString());

    // Get count of messages sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: messagesSentToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('ai_generated', true)
      .gte('sent_at', today.toISOString());

    // Get total AI enabled leads
    const { count: totalAILeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('ai_opt_in', true);

    return {
      pendingMessages: pendingMessages || 0,
      messagesSentToday: messagesSentToday || 0,
      totalAILeads: totalAILeads || 0
    };
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Error getting status:', error);
    return {
      pendingMessages: 0,
      messagesSentToday: 0,
      totalAILeads: 0
    };
  }
};

export const triggerAIAutomation = async () => {
  try {
    console.log('🚀 [AI AUTOMATION] Triggering unified automation');
    
    // Get leads that need AI messages
    const { data: dueLeads } = await supabase
      .from('leads')
      .select('id, first_name, last_name, ai_stage, ai_messages_sent')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', new Date().toISOString())
      .limit(50);

    if (!dueLeads || dueLeads.length === 0) {
      console.log('📭 [AI AUTOMATION] No leads due for messaging');
      return {
        processed: 0,
        successful: 0,
        failed: 0
      };
    }

    let successful = 0;
    let failed = 0;

    for (const lead of dueLeads) {
      try {
        // Here you would typically call an AI message generation service
        // For now, we'll just schedule the next message
        const success = await scheduleNextAIMessage(lead.id, lead.ai_stage);
        if (success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`❌ [AI AUTOMATION] Error processing lead ${lead.id}:`, error);
        failed++;
      }
    }

    console.log(`✅ [AI AUTOMATION] Processed ${dueLeads.length} leads: ${successful} successful, ${failed} failed`);
    
    return {
      processed: dueLeads.length,
      successful,
      failed
    };
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Error triggering automation:', error);
    return {
      processed: 0,
      successful: 0,
      failed: 0
    };
  }
};
