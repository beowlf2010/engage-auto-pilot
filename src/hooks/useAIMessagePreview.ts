
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
  nameDecision: 'approved' | 'denied' | null;
  vehicleDecision: 'approved' | 'denied' | null;
  error: string | null;
}

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent?: () => void;
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

  const handleNameDecision = useCallback((decision: 'approved' | 'denied') => {
    console.log('👤 [AI PREVIEW] Name decision:', decision);
    setState(prev => ({ ...prev, nameDecision: decision }));
  }, []);

  const handleVehicleDecision = useCallback((decision: 'approved' | 'denied') => {
    console.log('🚗 [AI PREVIEW] Vehicle decision:', decision);
    setState(prev => ({ ...prev, vehicleDecision: decision }));
  }, []);

  const generateWithDecisions = useCallback(async () => {
    console.log('⚡ [AI PREVIEW] Generating message with decisions');
    
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Use decisions or fallback to original data
      const finalName = state.nameDecision === 'approved' 
        ? state.originalDataQuality?.nameValidation?.suggestedName 
        : 'Customer';
      
      const finalVehicle = state.vehicleDecision === 'approved'
        ? state.originalDataQuality?.vehicleValidation?.suggestedVehicle
        : 'the right vehicle';

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

  const generatePreview = useCallback(() => {
    // Start the analysis process for preview generation
    startAnalysis();
  }, [startAnalysis]);

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

      setState(prev => ({ ...prev, isSending: false }));

      // Wait for database changes to propagate before calling onMessageSent
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onMessageSent) {
        console.log('🔄 [AI PREVIEW] Triggering onMessageSent callback');
        onMessageSent();
      }

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

  const cancel = useCallback(() => {
    console.log('🔄 [AI PREVIEW] Canceling and resetting state');
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
    generatePreview,
    sendNow,
    cancel,
    reset
  };
};
