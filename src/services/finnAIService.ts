
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { scheduleEnhancedAIMessages } from './enhancedAIMessageService';

export interface ToggleAIResult {
  success: boolean;
  newState: boolean;
  error?: string;
}

export const toggleFinnAI = async (leadId: string | number, currentState: boolean): Promise<ToggleAIResult> => {
  try {
    const newState = !currentState;
    
    // Update the lead's AI opt-in status
    const { error } = await supabase
      .from('leads')
      .update({ 
        ai_opt_in: newState,
        // Reset AI tracking when enabling
        ai_stage: newState ? 'day_1_morning' : null,
        ai_messages_sent: newState ? 0 : null,
        ai_sequence_paused: newState ? false : true,
        ai_pause_reason: newState ? null : 'manually_disabled',
        ai_resume_at: null,
        // Set next AI send time if enabling AI (immediate for aggressive start)
        next_ai_send_at: newState ? new Date().toISOString() : null
      })
      .eq('id', String(leadId));

    if (error) {
      console.error('Error toggling Finn AI:', error);
      toast({
        title: "Error",
        description: "Failed to update Finn AI settings",
        variant: "destructive"
      });
      return { success: false, newState: currentState, error: error.message };
    }

    // If enabling AI, schedule the aggressive message sequence
    if (newState) {
      await scheduleEnhancedAIMessages(String(leadId));
    }

    // Show success toast
    toast({
      title: newState ? "Finn AI Enabled" : "Finn AI Disabled",
      description: newState 
        ? "Finn will now send an aggressive sequence of automated follow-ups for this lead" 
        : "Finn will no longer send automated messages for this lead",
      variant: "default"
    });

    return { success: true, newState };
  } catch (error) {
    console.error('Error toggling Finn AI:', error);
    toast({
      title: "Error",
      description: "An unexpected error occurred",
      variant: "destructive"
    });
    return { 
      success: false, 
      newState: currentState, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
