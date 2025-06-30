
import { useState, useCallback } from 'react';

export interface AIDecisionsState {
  nameDecision: 'approved' | 'denied' | null;
  vehicleDecision: 'approved' | 'denied' | null;
}

export const useAIDecisions = () => {
  const [state, setState] = useState<AIDecisionsState>({
    nameDecision: null,
    vehicleDecision: null
  });

  const handleNameDecision = useCallback((decision: 'approved' | 'denied') => {
    console.log('👤 [AI DECISIONS] Name decision:', decision);
    setState(prev => ({ ...prev, nameDecision: decision }));
  }, []);

  const handleVehicleDecision = useCallback((decision: 'approved' | 'denied') => {
    console.log('🚗 [AI DECISIONS] Vehicle decision:', decision);
    setState(prev => ({ ...prev, vehicleDecision: decision }));
  }, []);

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
