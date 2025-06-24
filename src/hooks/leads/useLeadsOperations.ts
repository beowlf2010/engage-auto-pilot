
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLeadsOperations = () => {
  const { toast } = useToast();

  const updateAiOptIn = async (leadId: string, aiOptIn: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_opt_in: aiOptIn })
        .eq('id', leadId);

      if (error) throw error;

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
