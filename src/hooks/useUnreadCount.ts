import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { UnreadCountService } from '@/services/unreadCountService';

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);
      if (rolesError) {
        console.warn('⚠️ [UNREAD COUNT] Could not fetch user roles:', rolesError);
      }
      const userRoles = rolesData?.map(r => r.role) || [];
      const count = await UnreadCountService.getUnreadCount({
        respectUserRole: true,
        userId: profile.id,
        userRoles
      });
      setUnreadCount(count);
    } catch (error) {
      console.warn('Error in fetchUnreadCount:', error);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    // Subscribe to real-time updates with debounced callback
    const channel = supabase
      .channel(`unread-count-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `direction=eq.in`
        },
        fetchUnreadCount
      )
      .subscribe();

    // Polling fallback to keep count fresh even if realtime degrades
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [profile?.id, fetchUnreadCount]);

  return unreadCount;
};