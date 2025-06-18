
import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeChannels = () => {
  // DISABLED: This hook is disabled to prevent subscription conflicts
  // Use useCentralizedRealtime instead
  console.log('useRealtimeChannels is disabled - using centralized realtime instead');

  const setupConversationChannel = useCallback(() => {
    console.log('setupConversationChannel disabled - using centralized realtime');
  }, []);

  const setupMessageChannel = useCallback(() => {
    console.log('setupMessageChannel disabled - using centralized realtime');
  }, []);

  const setCurrentLeadId = useCallback(() => {
    console.log('setCurrentLeadId disabled - using centralized realtime');
  }, []);

  const cleanupAllChannels = useCallback(() => {
    console.log('cleanupAllChannels disabled - using centralized realtime');
  }, []);

  return {
    setupConversationChannel,
    setupMessageChannel,
    setCurrentLeadId,
    cleanupAllChannels
  };
};
