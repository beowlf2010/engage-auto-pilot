
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePersonalName } from '@/services/nameValidationService';
import { validateVehicleInterest } from '@/services/vehicleInterestValidationService';

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

      console.log('🔍 [AI ANALYSIS] Running real validation analysis...');

      // Real name validation using actual service
      const nameValidation = await validatePersonalName(lead.first_name || '');
      console.log('📝 [AI ANALYSIS] Name validation result:', nameValidation);

      // Real vehicle validation using actual service
      const vehicleValidation = validateVehicleInterest(lead.vehicle_interest);
      console.log('🚗 [AI ANALYSIS] Vehicle validation result:', vehicleValidation);

      // Build data quality object using real validation results
      const dataQuality = {
        nameValidation: {
          quality: nameValidation.confidence > 0.7 ? 'good' : nameValidation.confidence > 0.4 ? 'fair' : 'poor',
          confidence: nameValidation.confidence,
          suggestedName: nameValidation.isValidPersonalName ? lead.first_name : 'Customer',
          isValidPersonalName: nameValidation.isValidPersonalName,
          detectedType: nameValidation.detectedType,
          timesApproved: nameValidation.timesApproved || 0,
          timesRejected: nameValidation.timesRejected || 0,
          timesSeen: nameValidation.timesSeen || 0,
          userOverride: nameValidation.userOverride || false,
          contextualGreeting: nameValidation.suggestions.contextualGreeting,
          leadSourceHint: nameValidation.suggestions.leadSourceHint
        },
        vehicleValidation: {
          quality: vehicleValidation.isValid ? 'good' : 'poor',
          confidence: vehicleValidation.isValid ? 0.8 : 0.3,
          suggestedVehicle: vehicleValidation.sanitizedMessage,
          isValidVehicleInterest: vehicleValidation.isValid,
          detectedIssue: vehicleValidation.reason || 'None',
          originalValue: vehicleValidation.originalValue
        }
      };

      console.log('✅ [AI ANALYSIS] Final data quality assessment:', dataQuality);

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
