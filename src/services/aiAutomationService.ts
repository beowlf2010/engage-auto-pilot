
import { supabase } from '@/integrations/supabase/client';

export interface AIAutomationResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    leadId: string;
    success: boolean;
    message?: string;
    error?: string;
    nextStage?: string;
    nextSendTime?: string;
  }>;
}

// Trigger AI automation manually
export const triggerAIAutomation = async (): Promise<AIAutomationResult> => {
  try {
    console.log('🤖 Triggering AI automation...');
    
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: { manual: true }
    });

    if (error) {
      throw error;
    }

    console.log('✅ AI automation completed:', data);
    return data;
  } catch (error) {
    console.error('❌ AI automation failed:', error);
    throw error;
  }
};

// Get AI automation status and stats
export const getAIAutomationStatus = async () => {
  try {
    // Get leads that need AI messages
    const { data: pendingLeads, error: pendingError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, vehicle_interest, next_ai_send_at, ai_stage')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lt('next_ai_send_at', new Date().toISOString())
      .limit(50);

    if (pendingError) throw pendingError;

    // Get recent AI messages sent today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMessages, error: todayError } = await supabase
      .from('conversations')
      .select('id, lead_id, sent_at')
      .eq('ai_generated', true)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .lt('sent_at', `${today}T23:59:59.999Z`);

    if (todayError) throw todayError;

    // Get total AI-enabled leads
    const { data: aiLeads, error: aiLeadsError } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false);

    if (aiLeadsError) throw aiLeadsError;

    return {
      pendingMessages: pendingLeads?.length || 0,
      messagesSentToday: todayMessages?.length || 0,
      totalAILeads: aiLeads?.length || 0,
      pendingLeads: pendingLeads || []
    };
  } catch (error) {
    console.error('Error getting AI automation status:', error);
    throw error;
  }
};

// Enable AI for a lead with initial scheduling
export const enableAIForLead = async (leadId: string): Promise<boolean> => {
  try {
    // Schedule first message for 1 hour from now
    const nextSendTime = new Date();
    nextSendTime.setHours(nextSendTime.getHours() + 1);

    const { error } = await supabase
      .from('leads')
      .update({
        ai_opt_in: true,
        ai_sequence_paused: false,
        ai_stage: 'initial',
        ai_messages_sent: 0,
        next_ai_send_at: nextSendTime.toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    console.log(`✅ AI enabled for lead ${leadId}, first message scheduled for ${nextSendTime.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Error enabling AI for lead:', error);
    return false;
  }
};

// Pause AI sequence for a lead
export const pauseAIForLead = async (leadId: string, reason?: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        ai_sequence_paused: true,
        ai_pause_reason: reason || 'Manual pause',
        ai_resume_at: null
      })
      .eq('id', leadId);

    if (error) throw error;

    console.log(`⏸️ AI paused for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error('Error pausing AI for lead:', error);
    return false;
  }
};

// Resume AI sequence for a lead
export const resumeAIForLead = async (leadId: string): Promise<boolean> => {
  try {
    // Schedule next message for 1 hour from now
    const nextSendTime = new Date();
    nextSendTime.setHours(nextSendTime.getHours() + 1);

    const { error } = await supabase
      .from('leads')
      .update({
        ai_sequence_paused: false,
        ai_pause_reason: null,
        ai_resume_at: null,
        next_ai_send_at: nextSendTime.toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    console.log(`▶️ AI resumed for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error('Error resuming AI for lead:', error);
    return false;
  }
};
