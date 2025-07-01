
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export const useAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const { profile } = useAuth();

  // DISABLED: This scheduler is now disabled and replaced with unifiedAI
  const processScheduledMessages = async () => {
    console.log('🚫 [AI SCHEDULER] This scheduler is disabled - using unifiedAI instead');
    // No longer processing messages to prevent conflicts with conversation-aware system
  };

  // No longer running any intervals to prevent conflicts with centralized system
  useEffect(() => {
    if (!profile) return;

    console.log('🚫 AI scheduler disabled - using unifiedAI service instead');
    
    // Cleanup any existing scheduled tasks that might cause conflicts
    return () => {
      console.log('🚫 AI scheduler cleanup (disabled)');
    };
  }, [profile, processing]);

  return { processing, processScheduledMessages };
};
