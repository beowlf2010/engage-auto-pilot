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
    // For now, we'll store call outcomes in a simplified way since call_queue table doesn't exist yet
    // In a full implementation, this would update the actual call_queue table
    console.log('Recording call outcome:', outcome);

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
      // We'll update temperature via a separate function that calculates it properly
      await updateLeadTemperature(progression.lead_id, progression.temperature_change);
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
    // Use the existing calculate_lead_temperature function and adjust by the change
    const { data, error } = await supabase.rpc('calculate_lead_temperature', {
      p_lead_id: leadId
    });

    if (!error && typeof data === 'number') {
      const newTemperature = Math.max(0, Math.min(100, data + temperatureChange));
      
      // For now, we'll just log the temperature change since the field doesn't exist
      console.log(`Lead ${leadId} temperature would be updated to ${newTemperature}`);
      
      // In a full implementation, this would update the lead_temperature field
      // await supabase
      //   .from('leads')
      //   .update({ 
      //     lead_temperature: newTemperature,
      //     temperature_last_updated: new Date().toISOString()
      //   })
      //   .eq('id', leadId);
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
    // For now, return placeholder data since call_queue table doesn't exist
    // In a full implementation, this would query the actual call_queue table
    
    const placeholderStats = {
      total_calls: leadId ? 3 : 28,
      successful_calls: leadId ? 2 : 18,
      voicemails: leadId ? 1 : 6,
      no_answers: leadId ? 0 : 4,
      average_duration: leadId ? 156 : 142
    };

    return placeholderStats;
  } catch (error) {
    console.error('Error in getCallOutcomeStats:', error);
    return null;
  }
};