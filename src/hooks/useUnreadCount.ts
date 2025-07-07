import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('direction', 'in')
        .is('read_at', null);

      if (error) {
        console.warn('Error fetching unread count:', error);
        return;
      }

      setUnreadCount(data?.length || 0);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchUnreadCount]);

  return unreadCount;
};