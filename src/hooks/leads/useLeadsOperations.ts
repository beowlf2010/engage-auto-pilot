
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { transitionLeadStatus } from '@/services/leadStatusTransitionService';

export const useLeadsOperations = () => {
  const { toast } = useToast();

  const updateAiOptIn = async (leadId: string, aiOptIn: boolean) => {
    try {
      // First get the current lead status
      const { data: leadData, error: fetchError } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();

      if (fetchError) throw fetchError;

    const updateData: any = { ai_opt_in: aiOptIn };

    // If enabling AI, set immediate send time and clear pause
    if (aiOptIn) {
      updateData.next_ai_send_at = new Date().toISOString();
      updateData.ai_stage = 'ready_for_contact';
      updateData.ai_sequence_paused = false;
      updateData.ai_pause_reason = null;
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

      if (error) throw error;

      // If enabling AI and lead is still 'new', transition to 'engaged'
      if (aiOptIn && leadData?.status === 'new') {
        await transitionLeadStatus(leadId, 'engaged', 'AI messaging enabled');
      }

      toast({
        title: "Success",
        description: `AI messaging ${aiOptIn ? 'enabled' : 'disabled'} for lead`,
      });

      return true;
    } catch (error) {
      console.error('Error updating AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateDoNotContact = async (
    leadId: string, 
    field: 'doNotCall' | 'doNotEmail' | 'doNotMail', 
    value: boolean
  ) => {
    try {
      const dbField = field === 'doNotCall' ? 'do_not_call' : 
                     field === 'doNotEmail' ? 'do_not_email' : 'do_not_mail';
      
      const { error } = await supabase
        .from('leads')
        .update({ [dbField]: value })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Do not ${field.replace('doNot', '').toLowerCase()} ${value ? 'enabled' : 'disabled'}`,
      });

      return true;
    } catch (error) {
      console.error('Error updating do not contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact preferences",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    updateAiOptIn,
    updateDoNotContact
  };
};
