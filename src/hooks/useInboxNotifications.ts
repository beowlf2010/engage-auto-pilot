
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export const useInboxNotifications = () => {
  const { toast } = useToast();
  const { profile } = useAuth();

  // DISABLED: This hook is disabled to prevent subscription conflicts
  // Use useCentralizedRealtime instead
  console.log('useInboxNotifications is disabled - using centralized realtime instead');

  return {
    notificationPermission: 'default' as NotificationPermission
  };
};
