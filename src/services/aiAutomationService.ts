
import { supabase } from '@/integrations/supabase/client';

export const enableAIForLead = async (leadId: string): Promise<boolean> => {
  try {
    console.log(`🤖 [AI AUTOMATION] Enabling enhanced AI for lead: ${leadId}`);
    
    // Calculate next AI send time - enhanced aggressive timing (1-3 hours from now)
    const nextSendTime = new Date();
    const hoursToAdd = 1 + Math.random() * 2; // 1-3 hours for immediate engagement
    nextSendTime.setTime(nextSendTime.getTime() + (hoursToAdd * 60 * 60 * 1000));
    
    console.log(`📅 [AI AUTOMATION] Next message scheduled for: ${nextSendTime.toLocaleString()}`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        ai_opt_in: true,
        ai_sequence_paused: false,
        ai_pause_reason: null,
        message_intensity: 'aggressive', // Default to aggressive for new AI leads
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

    console.log('✅ [AI AUTOMATION] Enhanced AI enabled successfully');
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
    console.log('📊 [AI AUTOMATION] Getting enhanced automation status');
    
    // Get counts of pending messages with better categorization
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

    // Calculate queue health score based on pending messages
    let queueHealthScore = 100;
    const pendingCount = pendingMessages || 0;
    if (pendingCount > 100) {
      queueHealthScore = 25;
    } else if (pendingCount > 50) {
      queueHealthScore = 50;
    } else if (pendingCount > 20) {
      queueHealthScore = 70;
    } else if (pendingCount > 10) {
      queueHealthScore = 90;
    }

    // Calculate average success rate from recent conversations
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('lead_id, direction')
      .eq('ai_generated', true)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(100);

    let avgSuccessRate = 85; // Default fallback
    if (recentConversations && recentConversations.length > 0) {
      const outgoingMessages = recentConversations.filter(c => c.direction === 'out');
      const leadIds = [...new Set(outgoingMessages.map(c => c.lead_id))];
      
      // Check for responses from these leads
      const { data: responses } = await supabase
        .from('conversations')
        .select('lead_id')
        .in('lead_id', leadIds)
        .eq('direction', 'in')
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (responses && outgoingMessages.length > 0) {
        const uniqueResponders = new Set(responses.map(r => r.lead_id));
        avgSuccessRate = Math.round((uniqueResponders.size / leadIds.length) * 100);
      }
    }

    return {
      pendingMessages: pendingMessages || 0,
      messagesSentToday: messagesSentToday || 0,
      totalAILeads: totalAILeads || 0,
      queueHealthScore,
      avgSuccessRate,
      systemStatus: (pendingMessages || 0) < 20 ? 'healthy' : 'backlogged',
      lastProcessingTime: new Date().toISOString(),
      enhanced: true // Flag indicating this is the enhanced system
    };
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Error getting status:', error);
    return {
      pendingMessages: 0,
      messagesSentToday: 0,
      totalAILeads: 0,
      queueHealthScore: 0,
      avgSuccessRate: 0,
      systemStatus: 'error'
    };
  }
};

export const triggerAIAutomation = async () => {
  try {
    console.log('🚀 [AI AUTOMATION] Triggering enhanced automation');
    
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: {
        automated: false,
        source: 'manual_trigger',
        priority: 'high',
        enhanced: true
      }
    });

    if (error) {
      throw error;
    }

    console.log(`✅ [AI AUTOMATION] Enhanced automation completed successfully`);
    
    return {
      processed: data.processed || 0,
      successful: data.successful || 0,
      failed: data.failed || 0,
      queueSize: data.queueSize || 0,
      processingTime: data.processingTime || 0,
      enhanced: true
    };
  } catch (error) {
    console.error('❌ [AI AUTOMATION] Error triggering automation:', error);
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      error: error.message
    };
  }
};

// New function to get detailed queue analysis
export const getQueueAnalysis = async () => {
  try {
    const { data } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, vehicle_interest, message_intensity,
        ai_messages_sent, next_ai_send_at, created_at, ai_stage
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .order('next_ai_send_at', { ascending: true });

    const now = new Date();
    const analysis = {
      total: data?.length || 0,
      overdue: data?.filter(lead => new Date(lead.next_ai_send_at) < now).length || 0,
      upcoming: data?.filter(lead => new Date(lead.next_ai_send_at) >= now).length || 0,
      byIntensity: {
        aggressive: data?.filter(lead => lead.message_intensity === 'aggressive').length || 0,
        gentle: data?.filter(lead => lead.message_intensity === 'gentle').length || 0,
        super_aggressive: data?.filter(lead => lead.message_intensity === 'super_aggressive').length || 0
      },
      avgOverdueHours: 0
    };

    if (analysis.overdue > 0) {
      const overdueLeads = data?.filter(lead => new Date(lead.next_ai_send_at) < now) || [];
      const totalOverdueMs = overdueLeads.reduce((sum, lead) => 
        sum + (now.getTime() - new Date(lead.next_ai_send_at).getTime()), 0
      );
      analysis.avgOverdueHours = Math.round(totalOverdueMs / (1000 * 60 * 60) / analysis.overdue);
    }

    return analysis;
  } catch (error) {
    console.error('Error getting queue analysis:', error);
    return {
      total: 0,
      overdue: 0,
      upcoming: 0,
      byIntensity: { aggressive: 0, gentle: 0, super_aggressive: 0 },
      avgOverdueHours: 0
    };
  }
};
