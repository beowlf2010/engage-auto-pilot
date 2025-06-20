
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUnifiedAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { profile } = useAuth();

  // DISABLED: This scheduler is disabled to prevent conflicts with ai-automation edge function
  const processAIMessages = async () => {
    console.log('🚫 [UNIFIED AI] This scheduler is disabled - using ai-automation edge function instead');
    // No longer processing messages to prevent duplicates and conflicts
  };

  // No longer running any intervals to prevent conflicts with centralized system
  useEffect(() => {
    if (!profile) return;

    console.log('🚫 Unified AI scheduler disabled - using centralized ai-automation edge function');
    
    // Cleanup any existing scheduled tasks that might cause conflicts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log('🚫 Unified AI scheduler cleanup (disabled)');
    };
  }, [profile]);

  return {
    processing,
    lastProcessedAt,
    processNow: processAIMessages
  };
};
