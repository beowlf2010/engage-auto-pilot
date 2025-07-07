
import { useState, useCallback } from 'react';
import { saveNameValidationDecision, saveVehicleValidationDecision } from '@/services/nameValidationLearningService';

export interface AIDecisionsState {
  nameDecision: 'approved' | 'denied' | null;
  vehicleDecision: 'approved' | 'denied' | null;
}

export const useAIDecisions = (firstName?: string, vehicleInterest?: string) => {
  const [state, setState] = useState<AIDecisionsState>({
    nameDecision: null,
    vehicleDecision: null
  });

  const handleNameDecision = useCallback((decision: 'approved' | 'denied') => {
    console.log('👤 [AI DECISIONS] Name decision:', decision);
    setState(prev => ({ ...prev, nameDecision: decision }));
    
    // Save the learning decision
    if (firstName) {
      saveNameValidationDecision(firstName, decision, 'Manual user decision');
    }
  }, [firstName]);

  const handleVehicleDecision = useCallback((decision: 'approved' | 'denied') => {
    console.log('🚗 [AI DECISIONS] Vehicle decision:', decision);
    setState(prev => ({ ...prev, vehicleDecision: decision }));
    
    // Save the learning decision
    if (vehicleInterest) {
      saveVehicleValidationDecision(vehicleInterest, decision, 'Manual user decision');
    }
  }, [vehicleInterest]);

  const reset = useCallback(() => {
    setState({
      nameDecision: null,
      vehicleDecision: null
    });
  }, []);

  const hasAllDecisions = state.nameDecision !== null && state.vehicleDecision !== null;

  return {
    ...state,
    handleNameDecision,
    handleVehicleDecision,
    hasAllDecisions,
    reset
  };
};
