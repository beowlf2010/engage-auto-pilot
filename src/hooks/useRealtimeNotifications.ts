
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface IncomingMessage {
  id: string;
  lead_id: string;
  direction: 'in' | 'out';
  body: string;
  sent_at: string;
}

export const useRealtimeNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // DISABLED: This hook is disabled to prevent subscription conflicts
  // Use useCentralizedRealtime instead
  console.log('useRealtimeNotifications is disabled - using centralized realtime instead');

  return {
    notificationPermission: 'default' as NotificationPermission
  };
};
