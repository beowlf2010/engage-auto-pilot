
import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

// DISABLED: This scheduler is disabled to prevent duplicate AI messages
// The new centralizedAIService with intelligent conversation AI handles all AI responses
export const useGlobalAIScheduler = () => {
  const { profile } = useAuth();
  const processingRef = useRef(false);

  // This hook is now disabled to prevent conflicts with the new intelligent AI system
  console.log('🚫 useGlobalAIScheduler is disabled - using centralizedAIService instead');

  const processScheduledMessages = async () => {
    console.log('🚫 processScheduledMessages disabled - using intelligent AI instead');
    // No longer processing messages to prevent duplicates
  };

  // No longer running any intervals to prevent duplicate AI messages
  useEffect(() => {
    if (!profile) return;

    console.log('🚫 Global AI scheduler disabled - using centralized intelligent AI system');
    
    // Cleanup any existing scheduled tasks that might cause duplicates
    return () => {
      console.log('🚫 Global AI scheduler cleanup (disabled)');
    };
  }, [profile]);

  return { processScheduledMessages };
};
