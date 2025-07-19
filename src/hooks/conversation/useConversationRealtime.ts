
import { useEffect, useRef } from 'react';

// DISABLED: This hook is now disabled to prevent subscription conflicts
// All realtime functionality has been moved to stableRealtimeManager
export const useConversationRealtime = (selectedLeadId: string | null, loadMessages: (leadId: string) => Promise<void>) => {
  const isDisabledRef = useRef(true);

  useEffect(() => {
    if (isDisabledRef.current) {
      console.log('🚫 [CONV REALTIME] This hook is disabled - using stableRealtimeManager instead');
      return;
    }
  }, [selectedLeadId, loadMessages]);

  // Return empty cleanup to maintain interface compatibility
  return;
};
