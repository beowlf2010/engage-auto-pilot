import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedAIMessage, resumePausedSequences } from '@/services/enhancedAIMessageService';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useEnhancedAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const { profile } = useAuth();

  const processScheduledMessages = async () => {
    if (!profile || processing) return;

    setProcessing(true);
    console.log('⚠️ Using deprecated inbox AI scheduler - global scheduler should handle this');

    try {
      // Resume any paused sequences that should resume
      await resumePausedSequences();
      
      // Note: This is now handled by the global scheduler
      console.log('✅ Deferring to global AI scheduler');
      
    } catch (error) {
      console.error('Error in deprecated AI scheduler:', error);
    } finally {
      setProcessing(false);
    }
  };

  // This hook is now deprecated in favor of the global scheduler
  // Keeping for backward compatibility but it won't start automatically

  return { processing, processScheduledMessages };
};
