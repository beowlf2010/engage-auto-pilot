
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AIMessagePreviewState {
  isAnalyzing: boolean;
  isGenerating: boolean;
  generatedMessage: string | null;
  showDecisionStep: boolean;
  showPreview: boolean;
  isSending: boolean;
  originalDataQuality: any;
  leadData: any;
  nameDecision: 'use_original' | 'use_suggested' | null;
  vehicleDecision: 'use_original' | 'use_suggested' | null;
  error: string | null;
}

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent: () => void;
}

export const useAIMessagePreview = ({ leadId, onMessageSent }: UseAIMessagePreviewProps) => {
  const [state, setState] = useState<AIMessagePreviewState>({
    isAnalyzing: false,
    isGenerating: false,
    generatedMessage: null,
    showDecisionStep: false,
    showPreview: false,
    isSending: false,
    originalDataQuality: null,
    leadData: null,
    nameDecision: null,
    vehicleDecision: null,
    error: null
  });

  const startAnalysis = useCallback(async () => {
    console.log('🔍 [AI PREVIEW] Starting analysis for lead:', leadId);
    
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      showDecisionStep: false,
      showPreview: false
    }));

    try {
      // Fetch lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      console.log('📊 [AI PREVIEW] Lead data fetched:', lead);

      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock data quality analysis
      const dataQuality = {
        nameValidation: {
          quality: 'good',
          confidence: 0.9,
          suggestedName: lead.first_name || 'Customer'
        },
        vehicleValidation: {
          quality: lead.vehicle_interest ? 'good' : 'poor',
          confidence: lead.vehicle_interest ? 0.8 : 0.3,
          suggestedVehicle: lead.vehicle_interest || 'the right vehicle'
        }
      };

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        showDecisionStep: true,
        originalDataQuality: dataQuality,
        leadData: lead
      }));

    } catch (error) {
      console.error('❌ [AI PREVIEW] Analysis failed:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: 'Failed to analyze lead data. Please try again.'
      }));
    }
  }, [leadId]);

  const handleNameDecision = useCallback((decision: 'use_original' | 'use_suggested') => {
    console.log('👤 [AI PREVIEW] Name decision:', decision);
    setState(prev => ({ ...prev, nameDecision: decision }));
  }, []);

  const handleVehicleDecision = useCallback((decision: 'use_original' | 'use_suggested') => {
    console.log('🚗 [AI PREVIEW] Vehicle decision:', decision);
    setState(prev => ({ ...prev, vehicleDecision: decision }));
  }, []);

  const generateWithDecisions = useCallback(async () => {
    console.log('⚡ [AI PREVIEW] Generating message with decisions');
    
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Use decisions or fallback to original data
      const finalName = state.nameDecision === 'use_suggested' 
        ? state.originalDataQuality?.nameValidation?.suggestedName 
        : state.leadData?.first_name || 'Customer';
      
      const finalVehicle = state.vehicleDecision === 'use_suggested'
        ? state.originalDataQuality?.vehicleValidation?.suggestedVehicle
        : state.leadData?.vehicle_interest || 'the right vehicle';

      console.log('📝 [AI PREVIEW] Using name:', finalName, 'vehicle:', finalVehicle);

      const { data, error } = await supabase.functions.invoke('generate-ai-message', {
        body: {
          leadId,
          leadName: finalName,
          vehicleInterest: finalVehicle,
          messageType: 'initial_contact'
        }
      });

      if (error) throw error;

      console.log('✅ [AI PREVIEW] Message generated:', data.message);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        showDecisionStep: false,
        showPreview: true,
        generatedMessage: data.message
      }));

    } catch (error) {
      console.error('❌ [AI PREVIEW] Generation failed:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: 'Failed to generate message. Please try again.'
      }));
    }
  }, [leadId, state.nameDecision, state.vehicleDecision, state.originalDataQuality, state.leadData]);

  const sendNow = useCallback(async () => {
    if (!state.generatedMessage) return;
    
    console.log('📤 [AI PREVIEW] Sending message for lead:', leadId);
    
    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      // First, enable AI opt-in in the database
      console.log('🤖 [AI PREVIEW] Enabling AI opt-in for lead:', leadId);
      
      const { error: aiOptInError } = await supabase
        .from('leads')
        .update({ ai_opt_in: true })
        .eq('id', leadId);

      if (aiOptInError) {
        console.error('❌ [AI PREVIEW] Failed to enable AI opt-in:', aiOptInError);
        throw aiOptInError;
      }

      console.log('✅ [AI PREVIEW] AI opt-in enabled successfully');

      // Then send the message
      const { error: sendError } = await supabase.functions.invoke('send-ai-message', {
        body: {
          leadId,
          message: state.generatedMessage,
          messageType: 'initial_contact'
        }
      });

      if (sendError) {
        console.error('❌ [AI PREVIEW] Failed to send message:', sendError);
        throw sendError;
      }

      console.log('✅ [AI PREVIEW] Message sent successfully');

      toast({
        title: "AI Enabled Successfully",
        description: "The lead has been opted into AI messaging and the initial message has been sent.",
      });

      // Wait a moment to ensure database changes are committed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now trigger the callback to update the UI
      console.log('🔄 [AI PREVIEW] Triggering onMessageSent callback');
      onMessageSent();

    } catch (error) {
      console.error('❌ [AI PREVIEW] Send failed:', error);
      setState(prev => ({
        ...prev,
        isSending: false,
        error: 'Failed to send message. Please try again.'
      }));
      
      toast({
        title: "Error",
        description: "Failed to enable AI messaging. Please try again.",
        variant: "destructive"
      });
    }
  }, [leadId, state.generatedMessage, onMessageSent]);

  const reset = useCallback(() => {
    console.log('🔄 [AI PREVIEW] Resetting state');
    setState({
      isAnalyzing: false,
      isGenerating: false,
      generatedMessage: null,
      showDecisionStep: false,
      showPreview: false,
      isSending: false,
      originalDataQuality: null,
      leadData: null,
      nameDecision: null,
      vehicleDecision: null,
      error: null
    });
  }, []);

  return {
    ...state,
    startAnalysis,
    handleNameDecision,
    handleVehicleDecision,
    generateWithDecisions,
    sendNow,
    reset
  };
};
