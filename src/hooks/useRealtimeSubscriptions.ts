
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IncomingMessage {
  id: string;
  lead_id: string;
  direction: 'in' | 'out';
  body: string;
  sent_at: string;
}

interface UseRealtimeSubscriptionsProps {
  onConversationUpdate: () => void;
  onMessageUpdate: (leadId: string) => void;
  currentLeadId: string | null;
}

export const useRealtimeSubscriptions = ({
  onConversationUpdate,
  onMessageUpdate,
  currentLeadId
}: UseRealtimeSubscriptionsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // DISABLED: This hook is disabled to prevent subscription conflicts
  // Use useCentralizedRealtime instead
  console.log('useRealtimeSubscriptions is disabled - using centralized realtime instead');

  return null;
};
