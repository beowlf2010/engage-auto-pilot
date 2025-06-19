
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sendInitialMessage } from './proactiveAIService';

export interface ToggleAIResult {
  success: boolean;
  newState: boolean;
  error?: string;
}

export const toggleFinnAI = async (leadId: string | number, currentState: boolean): Promise<ToggleAIResult> => {
  try {
    const newState = !currentState;
    
    console.log(`🔄 [FINN AI SERVICE] Toggling AI for lead ${leadId}: ${currentState} -> ${newState}`);
    
    // Update the lead's AI opt-in status
    const { error } = await supabase
      .from('leads')
      .update({ 
        ai_opt_in: newState,
        // Reset AI tracking when enabling
        ai_stage: newState ? 'ready_for_contact' : null,
        ai_messages_sent: newState ? 0 : null,
        ai_sequence_paused: newState ? false : true,
        ai_pause_reason: newState ? null : 'manually_disabled',
        ai_resume_at: null,
        // Set immediate send time if enabling AI (ready for immediate contact)
        next_ai_send_at: newState ? new Date().toISOString() : null
      })
      .eq('id', String(leadId));

    if (error) {
      console.error('❌ [FINN AI SERVICE] Error toggling Finn AI:', error);
      toast({
        title: "Error",
        description: "Failed to update Finn AI settings",
        variant: "destructive"
      });
      return { success: false, newState: currentState, error: error.message };
    }

    console.log(`✅ [FINN AI SERVICE] Successfully updated lead AI status`);

    // If enabling AI, send warm introduction message immediately
    if (newState) {
      try {
        console.log(`🚀 [FINN AI SERVICE] AI enabled, sending warm introduction...`);
        
        // Get the current user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!profile) throw new Error('No user profile found');
        
        console.log(`👤 [FINN AI SERVICE] Found profile for user:`, {
          profileId: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name
        });
        
        // Send warm introduction using the enhanced proactive AI service
        console.log(`📤 [FINN AI SERVICE] Calling sendInitialMessage...`);
        const result = await sendInitialMessage(String(leadId), profile);
        
        console.log(`📊 [FINN AI SERVICE] sendInitialMessage result:`, {
          success: result.success,
          messageSource: result.messageSource,
          hasMessage: !!result.message,
          error: result.error
        });
        
        if (result.success) {
          console.log(`✅ [FINN AI SERVICE] Warm introduction sent successfully!`);
          toast({
            title: "Finn AI Enabled",
            description: "Finn has been activated and sent a warm introduction to this lead!",
            variant: "default"
          });
        } else {
          console.warn('⚠️ [FINN AI SERVICE] Failed to send initial message:', result.error);
          toast({
            title: "Finn AI Enabled",
            description: "Finn is ready to start the conversation! The initial message will be sent shortly.",
            variant: "default"
          });
        }
      } catch (messageError) {
        console.error('❌ [FINN AI SERVICE] Error sending warm introduction:', messageError);
        toast({
          title: "Finn AI Enabled",
          description: "Finn is ready to start the conversation! The initial message will be sent shortly.",
          variant: "default"
        });
      }
    } else {
      console.log(`🔕 [FINN AI SERVICE] AI disabled for lead ${leadId}`);
      toast({
        title: "Finn AI Disabled",
        description: "Finn will no longer send automated messages for this lead",
        variant: "default"
      });
    }

    return { success: true, newState };
  } catch (error) {
    console.error('❌ [FINN AI SERVICE] Error toggling Finn AI:', error);
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
