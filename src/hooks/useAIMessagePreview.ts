
import { useState, useCallback } from 'react';
import { useAIAnalysis } from './ai-preview/useAIAnalysis';
import { useAIDecisions } from './ai-preview/useAIDecisions';
import { useAIMessageGeneration } from './ai-preview/useAIMessageGeneration';
import { useAIMessageSender } from './ai-preview/useAIMessageSender';

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
  const [uiState, setUIState] = useState({
    showDecisionStep: false,
    showPreview: false
  });

  const analysis = useAIAnalysis(leadId);
  const decisions = useAIDecisions();
  const generation = useAIMessageGeneration(leadId);
  const sender = useAIMessageSender(leadId, onMessageSent);

  const startAnalysis = useCallback(async () => {
    try {
      setUIState({ showDecisionStep: false, showPreview: false });
      const result = await analysis.startAnalysis();
      setUIState({ showDecisionStep: true, showPreview: false });
      return result;
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }, [analysis]);

  const generateWithDecisions = useCallback(async () => {
    try {
      const message = await generation.generateMessage(
        decisions.nameDecision,
        decisions.vehicleDecision,
        analysis.originalDataQuality,
        analysis.leadData
      );
      
      if (message) {
        setUIState({ showDecisionStep: false, showPreview: true });
      }
      
      return message;
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }, [generation, decisions, analysis]);

  const sendNow = useCallback(async () => {
    if (generation.generatedMessage) {
      await sender.sendMessage(generation.generatedMessage);
    }
  }, [sender, generation.generatedMessage]);

  const reset = useCallback(() => {
    analysis.reset();
    decisions.reset();
    generation.reset();
    sender.reset();
    setUIState({ showDecisionStep: false, showPreview: false });
  }, [analysis, decisions, generation, sender]);

  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  // Generate preview (alias for startAnalysis)
  const generatePreview = useCallback(() => {
    startAnalysis();
  }, [startAnalysis]);

  // Combine all state
  const combinedState: AIMessagePreviewState = {
    isAnalyzing: analysis.isAnalyzing,
    isGenerating: generation.isGenerating,
    generatedMessage: generation.generatedMessage,
    showDecisionStep: uiState.showDecisionStep,
    showPreview: uiState.showPreview,
    isSending: sender.isSending,
    originalDataQuality: analysis.originalDataQuality,
    leadData: analysis.leadData,
    nameDecision: decisions.nameDecision,
    vehicleDecision: decisions.vehicleDecision,
    error: analysis.error || generation.error || sender.error
  };

  return {
    ...combinedState,
    startAnalysis,
    handleNameDecision: decisions.handleNameDecision,
    handleVehicleDecision: decisions.handleVehicleDecision,
    generateWithDecisions,
    generatePreview,
    sendNow,
    cancel,
    reset
  };
};
