
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ScheduleRepairResult {
  rescheduled: number;
  errors: string[];
  summary: {
    totalOverdue: number;
    totalActive: number;
    averageDelayHours: number;
  };
}

export const repairOverdueSchedules = async (): Promise<ScheduleRepairResult> => {
  try {
    console.log('🔧 Starting AI schedule repair...');
    
    // Get all overdue AI-enabled leads
    const { data: overdueLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, next_ai_send_at, ai_stage, created_at')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lt('next_ai_send_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    const result: ScheduleRepairResult = {
      rescheduled: 0,
      errors: [],
      summary: {
        totalOverdue: overdueLeads?.length || 0,
        totalActive: 0,
        averageDelayHours: 0
      }
    };

    if (!overdueLeads || overdueLeads.length === 0) {
      console.log('✅ No overdue messages found');
      return result;
    }

    console.log(`📋 Found ${overdueLeads.length} overdue AI schedules`);

    // Calculate new send times with intelligent spacing
    const now = new Date();
    const baseInterval = 2; // hours between messages
    const maxBatchSize = 10; // prevent overwhelming

    for (let i = 0; i < overdueLeads.length && i < maxBatchSize; i++) {
      const lead = overdueLeads[i];
      
      try {
        // Calculate next send time with progressive delay
        const delayHours = baseInterval + (i * 0.5); // Spread messages over time
        const nextSendTime = new Date(now.getTime() + (delayHours * 60 * 60 * 1000));
        
        // Add some randomization to avoid exact timing conflicts
        const randomMinutes = Math.floor(Math.random() * 30);
        nextSendTime.setMinutes(nextSendTime.getMinutes() + randomMinutes);

        // Update the lead's schedule
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            next_ai_send_at: nextSendTime.toISOString(),
            ai_stage: lead.ai_stage || 'follow_up'
          })
          .eq('id', lead.id);

        if (updateError) {
          result.errors.push(`Failed to reschedule ${lead.first_name} ${lead.last_name}: ${updateError.message}`);
        } else {
          result.rescheduled++;
          console.log(`✅ Rescheduled ${lead.first_name} ${lead.last_name} for ${nextSendTime.toLocaleString()}`);
        }
      } catch (error) {
        result.errors.push(`Error processing lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Get updated stats
    const { data: activeLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null);

    result.summary.totalActive = activeLeads?.length || 0;

    console.log(`🎯 Schedule repair complete: ${result.rescheduled} rescheduled, ${result.errors.length} errors`);
    return result;

  } catch (error) {
    console.error('Error repairing AI schedules:', error);
    throw error;
  }
};

export const scheduleOptimalAIMessage = async (leadId: string): Promise<boolean> => {
  try {
    // Get lead information
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead || !lead.ai_opt_in || lead.ai_sequence_paused) {
      return false;
    }

    // Calculate optimal next send time
    const now = new Date();
    const nextSendTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from now
    
    // Add business hours optimization (9 AM - 6 PM)
    if (nextSendTime.getHours() < 9) {
      nextSendTime.setHours(9, 0, 0, 0);
    } else if (nextSendTime.getHours() >= 18) {
      nextSendTime.setDate(nextSendTime.getDate() + 1);
      nextSendTime.setHours(9, 0, 0, 0);
    }

    const { error } = await supabase
      .from('leads')
      .update({
        next_ai_send_at: nextSendTime.toISOString(),
        ai_stage: 'scheduled'
      })
      .eq('id', leadId);

    return !error;
  } catch (error) {
    console.error('Error scheduling optimal AI message:', error);
    return false;
  }
};
