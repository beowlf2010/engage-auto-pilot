
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIMessageGenerationState {
  isGenerating: boolean;
  generatedMessage: string | null;
  error: string | null;
}

export const useAIMessageGeneration = (leadId: string) => {
  const [state, setState] = useState<AIMessageGenerationState>({
    isGenerating: false,
    generatedMessage: null,
    error: null
  });

  const generateMessage = useCallback(async (
    nameDecision: 'approved' | 'denied' | null,
    vehicleDecision: 'approved' | 'denied' | null,
    originalDataQuality: any,
    leadData: any
  ) => {
    console.log('⚡ [AI MESSAGE GEN] Generating message with decisions');
    
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      console.log('📝 [AI MESSAGE GEN] Sending decisions to edge function:', {
        nameDecision,
        vehicleDecision,
        leadName: leadData?.first_name,
        vehicleInterest: leadData?.vehicle_interest
      });

      const { data, error } = await supabase.functions.invoke('generate-ai-message', {
        body: {
          leadId,
          leadData,
          nameDecision,
          vehicleDecision,
          originalDataQuality,
          messageType: 'initial_contact'
        }
      });

      if (error) throw error;

      console.log('✅ [AI MESSAGE GEN] Message generated:', data.message);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        generatedMessage: data.message
      }));

      return data.message;

    } catch (error) {
      console.error('❌ [AI MESSAGE GEN] Generation failed:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: 'Failed to generate message. Please try again.'
      }));
      throw error;
    }
  }, [leadId]);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      generatedMessage: null,
      error: null
    });
  }, []);

  return {
    ...state,
    generateMessage,
    reset
  };
};
