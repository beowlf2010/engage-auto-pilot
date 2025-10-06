import { supabase } from "@/integrations/supabase/client";

export interface AIRestartResult {
  success: boolean;
  error?: string;
}

/**
 * Restarts the AI messaging sequence for a lead
 * - Sets ai_opt_in = true
 * - Sets ai_stage = 'ready_for_contact'
 * - Sets next_ai_send_at = NOW()
 * - Clears ai_sequence_paused and ai_pause_reason
 */
export async function restartAISequence(leadId: string): Promise<AIRestartResult> {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        ai_opt_in: true,
        ai_stage: 'ready_for_contact',
        next_ai_send_at: new Date().toISOString(),
        ai_sequence_paused: false,
        ai_pause_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error restarting AI sequence:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception restarting AI sequence:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
