
import { supabase } from '@/integrations/supabase/client';

export const updateVehicleInterest = async (leadId: string, vehicleInterest: string) => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ vehicle_interest: vehicleInterest })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating vehicle interest:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating vehicle interest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update vehicle interest' 
    };
  }
};

export const updateAIFollowupLevel = async (leadId: string, intensity: string) => {
  try {
    const nextSendTime = new Date();
    
    // Set next send time based on intensity
    switch (intensity) {
      case 'aggressive':
        nextSendTime.setHours(nextSendTime.getHours() + 24); // Daily
        break;
      case 'standard':
        nextSendTime.setDate(nextSendTime.getDate() + 2); // Every 2-3 days
        break;
      case 'gentle':
        nextSendTime.setDate(nextSendTime.getDate() + 7); // Weekly
        break;
      case 'minimal':
        nextSendTime.setMonth(nextSendTime.getMonth() + 1); // Monthly
        break;
      default:
        nextSendTime.setDate(nextSendTime.getDate() + 2);
    }

    const { error } = await supabase
      .from('leads')
      .update({
        message_intensity: intensity,
        next_ai_send_at: nextSendTime.toISOString(),
        ai_sequence_paused: false,
        ai_pause_reason: null
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating AI followup level:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating AI followup level:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update AI followup level' 
    };
  }
};
