
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIAnalysisState {
  isAnalyzing: boolean;
  originalDataQuality: any;
  leadData: any;
  error: string | null;
}

export const useAIAnalysis = (leadId: string) => {
  const [state, setState] = useState<AIAnalysisState>({
    isAnalyzing: false,
    originalDataQuality: null,
    leadData: null,
    error: null
  });

  const startAnalysis = useCallback(async () => {
    console.log('🔍 [AI ANALYSIS] Starting analysis for lead:', leadId);
    
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null
    }));

    try {
      // Fetch lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      console.log('📊 [AI ANALYSIS] Lead data fetched:', lead);

      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock data quality analysis
      const dataQuality = {
        nameValidation: {
          quality: 'good',
          confidence: 0.9,
          suggestedName: lead.first_name || 'Customer',
          isValidPersonalName: true,
          detectedType: 'personal_name'
        },
        vehicleValidation: {
          quality: lead.vehicle_interest ? 'good' : 'poor',
          confidence: lead.vehicle_interest ? 0.8 : 0.3,
          suggestedVehicle: lead.vehicle_interest || 'the right vehicle',
          isValidVehicleInterest: !!lead.vehicle_interest,
          detectedIssue: lead.vehicle_interest ? 'None' : 'Missing vehicle interest'
        }
      };

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        originalDataQuality: dataQuality,
        leadData: lead
      }));

      return { dataQuality, leadData: lead };

    } catch (error) {
      console.error('❌ [AI ANALYSIS] Analysis failed:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: 'Failed to analyze lead data. Please try again.'
      }));
      throw error;
    }
  }, [leadId]);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      originalDataQuality: null,
      leadData: null,
      error: null
    });
  }, []);

  return {
    ...state,
    startAnalysis,
    reset
  };
};
