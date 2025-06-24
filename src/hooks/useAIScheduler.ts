
import { useState, useEffect } from 'react';
import { consolidatedAI } from '@/services/consolidatedAIService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const { profile } = useAuth();

  // DISABLED: This scheduler is now disabled and replaced with consolidatedAI
  const processScheduledMessages = async () => {
    console.log('🚫 [AI SCHEDULER] This scheduler is disabled - using consolidatedAI instead');
    // No longer processing messages to prevent conflicts with conversation-aware system
  };

  // No longer running any intervals to prevent conflicts with centralized system
  useEffect(() => {
    if (!profile) return;

    console.log('🚫 AI scheduler disabled - using consolidatedAI service instead');
    
    // Cleanup any existing scheduled tasks that might cause conflicts
    return () => {
      console.log('🚫 AI scheduler cleanup (disabled)');
    };
  }, [profile, processing]);

  return { processing, processScheduledMessages };
};
