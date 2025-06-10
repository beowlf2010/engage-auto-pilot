
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
        // Set next AI send time if enabling AI (24 hours from now)
        next_ai_send_at: newState ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
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

    // Show success toast
    toast({
      title: newState ? "Finn AI Enabled" : "Finn AI Disabled",
      description: newState 
        ? "Finn will now send automated follow-ups for this lead" 
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
