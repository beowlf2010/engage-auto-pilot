import { useEffect, useState } from 'react';
import { aiIntelligenceHub } from '@/services/aiIntelligenceHub';

export const useAIIntelligenceInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeIntelligence = async () => {
      try {
        console.log('🚀 [AI INIT] Initializing AI Intelligence Hub...');
        setIsInitializing(true);
        setInitializationError(null);
        
        await aiIntelligenceHub.initializeIntelligenceServices();
        
        console.log('✅ [AI INIT] AI Intelligence Hub initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ [AI INIT] Failed to initialize AI Intelligence Hub:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeIntelligence();
  }, []);

  return {
    isInitialized,
    isInitializing,
    initializationError,
    getIntelligenceInsights: () => aiIntelligenceHub.getIntelligenceInsights(),
    processIntelligenceFeedback: (leadId: string, responseId: string, feedback: any) => 
      aiIntelligenceHub.processIntelligenceFeedback(leadId, responseId, feedback)
  };
};