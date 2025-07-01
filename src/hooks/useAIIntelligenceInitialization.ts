
import { useEffect, useState } from 'react';
import { aiIntelligenceInitializer } from '@/services/aiIntelligenceInitializer';

export const useAIIntelligenceInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAI = async () => {
      if (isInitialized || isInitializing) return;

      setIsInitializing(true);
      setInitializationError(null);

      try {
        await aiIntelligenceInitializer.initialize();
        setIsInitialized(true);
        console.log('🎯 [AI-HOOK] AI Intelligence system ready');
      } catch (error) {
        console.error('❌ [AI-HOOK] AI Intelligence initialization failed:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAI();
  }, [isInitialized, isInitializing]);

  const retryInitialization = async () => {
    setIsInitialized(false);
    setInitializationError(null);
  };

  return {
    isInitialized,
    isInitializing,
    initializationError,
    retryInitialization
  };
};
