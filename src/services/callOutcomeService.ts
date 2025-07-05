import { supabase } from '@/integrations/supabase/client';

export interface CallOutcome {
  call_id: string;
  lead_id: string;
  outcome: 'answered' | 'voicemail' | 'busy' | 'no_answer' | 'disconnected' | 'appointment_scheduled' | 'callback_requested';
  duration?: number;
  notes?: string;
  next_action?: string;
  callback_scheduled_at?: string;
  appointment_scheduled?: boolean;
}

export interface CallProgressionData {
  lead_id: string;
  temperature_change: number;
  status_update?: string;
  ai_sequence_adjustment?: 'pause' | 'resume' | 'accelerate' | 'decelerate';
  priority_adjustment?: number;
}

export const recordCallOutcome = async (outcome: CallOutcome): Promise<{ success: boolean; error?: string }> => {
  try {
    // Insert call outcome into the database
    const { error: insertError } = await supabase
      .from('call_outcomes')
      .insert({
        lead_id: outcome.lead_id,
        phone_number: outcome.call_id.includes('_') ? outcome.call_id.split('_')[1] : 'unknown',
        outcome: outcome.outcome,
        duration_seconds: outcome.duration,
        notes: outcome.notes,
        next_action: outcome.next_action,
        callback_scheduled_at: outcome.callback_scheduled_at,
        appointment_scheduled: outcome.appointment_scheduled || false,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (insertError) {
      console.error('Error inserting call outcome:', insertError);
      throw insertError;
    }

    // Update lead progression based on outcome
    const progressionData = calculateLeadProgression(outcome);
    if (progressionData) {
      await updateLeadProgression(progressionData);
    }

    // Schedule appointment if needed
    if (outcome.appointment_scheduled && outcome.callback_scheduled_at) {
      await scheduleFollowUpAppointment(outcome.lead_id, outcome.callback_scheduled_at);
    }

    return { success: true };
  } catch (error) {
    console.error('Error recording call outcome:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const calculateLeadProgression = (outcome: CallOutcome): CallProgressionData | null => {
  const baseProgression: CallProgressionData = {
    lead_id: outcome.lead_id,
    temperature_change: 0,
    priority_adjustment: 0
  };

  switch (outcome.outcome) {
    case 'answered':
      baseProgression.temperature_change = 15;
      baseProgression.status_update = 'contacted';
      baseProgression.ai_sequence_adjustment = 'pause'; // Pause AI while human contact is active
      baseProgression.priority_adjustment = 5;
      break;

    case 'appointment_scheduled':
      baseProgression.temperature_change = 25;
      baseProgression.status_update = 'qualified';
      baseProgression.ai_sequence_adjustment = 'pause';
      baseProgression.priority_adjustment = 10;
      break;

    case 'callback_requested':
      baseProgression.temperature_change = 10;
      baseProgression.ai_sequence_adjustment = 'pause';
      baseProgression.priority_adjustment = 8;
      break;

    case 'voicemail':
      baseProgression.temperature_change = 2;
      baseProgression.ai_sequence_adjustment = 'resume';
      baseProgression.priority_adjustment = -2;
      break;

    case 'no_answer':
    case 'busy':
      baseProgression.temperature_change = -5;
      baseProgression.priority_adjustment = -3;
      break;

    case 'disconnected':
      baseProgression.temperature_change = -10;
      baseProgression.priority_adjustment = -5;
      break;

    default:
      return null;
  }

  return baseProgression;
};

const updateLeadProgression = async (progression: CallProgressionData) => {
  try {
    // Update lead temperature and status
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (progression.status_update) {
      updates.status = progression.status_update;
    }

    if (progression.temperature_change !== 0) {
      // Update lead temperature directly in the database
      const { data: currentLead } = await supabase
        .from('leads')
        .select('lead_temperature')
        .eq('id', progression.lead_id)
        .single();
      
      const currentTemp = currentLead?.lead_temperature || 50;
      const newTemp = Math.max(0, Math.min(100, currentTemp + progression.temperature_change));
      
      updates.lead_temperature = newTemp;
      updates.temperature_last_updated = new Date().toISOString();
    }

    if (progression.priority_adjustment !== 0) {
      updates.call_priority = progression.priority_adjustment;
    }

    // Handle AI sequence adjustments
    if (progression.ai_sequence_adjustment) {
      switch (progression.ai_sequence_adjustment) {
        case 'pause':
          updates.ai_sequence_paused = true;
          updates.ai_pause_reason = 'Human contact established';
          break;
        case 'resume':
          updates.ai_sequence_paused = false;
          updates.ai_pause_reason = null;
          break;
        case 'accelerate':
          // Reduce next AI send interval
          updates.next_ai_send_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
          break;
        case 'decelerate':
          // Increase next AI send interval
          updates.next_ai_send_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours
          break;
      }
    }

    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', progression.lead_id);

    if (error) {
      console.error('Error updating lead progression:', error);
    }
  } catch (error) {
    console.error('Error in updateLeadProgression:', error);
  }
};

const updateLeadTemperature = async (leadId: string, temperatureChange: number) => {
  try {
    // Get current temperature and update it
    const { data: currentLead } = await supabase
      .from('leads')
      .select('lead_temperature')
      .eq('id', leadId)
      .single();
    
    const currentTemp = currentLead?.lead_temperature || 50;
    const newTemperature = Math.max(0, Math.min(100, currentTemp + temperatureChange));
    
    const { error } = await supabase
      .from('leads')
      .update({ 
        lead_temperature: newTemperature,
        temperature_last_updated: new Date().toISOString()
      })
      .eq('id', leadId);
    
    if (error) {
      console.error('Error updating lead temperature:', error);
    }
  } catch (error) {
    console.error('Error updating lead temperature:', error);
  }
};

const scheduleFollowUpAppointment = async (leadId: string, scheduledAt: string) => {
  try {
    const { error } = await supabase
      .from('appointments')
      .insert({
        lead_id: leadId,
        scheduled_at: scheduledAt,
        title: 'Follow-up from Phone Call',
        description: 'Appointment scheduled during phone conversation',
        appointment_type: 'follow_up',
        status: 'scheduled',
        booking_source: 'phone_call',
        created_by: (await supabase.auth.getUser()).data.user?.id || ''
      });

    if (error) {
      console.error('Error scheduling follow-up appointment:', error);
    }
  } catch (error) {
    console.error('Error in scheduleFollowUpAppointment:', error);
  }
};

export const getCallOutcomeStats = async (leadId?: string) => {
  try {
    let query = supabase.from('call_outcomes').select('*');
    
    if (leadId) {
      query = query.eq('lead_id', leadId);
    }
    
    const { data: outcomes, error } = await query;
    
    if (error) throw error;
    
    const stats = {
      total_calls: outcomes?.length || 0,
      successful_calls: outcomes?.filter(o => ['answered', 'appointment_scheduled'].includes(o.outcome)).length || 0,
      voicemails: outcomes?.filter(o => o.outcome === 'voicemail').length || 0,
      no_answers: outcomes?.filter(o => o.outcome === 'no_answer').length || 0,
      average_duration: outcomes && outcomes.length > 0 
        ? Math.round(outcomes.reduce((sum, o) => sum + (o.duration_seconds || 0), 0) / outcomes.length)
        : 0
    };

    return stats;
  } catch (error) {
    console.error('Error in getCallOutcomeStats:', error);
    return null;
  }
};