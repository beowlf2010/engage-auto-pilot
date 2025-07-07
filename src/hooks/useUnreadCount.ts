import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id')
          .eq('direction', 'in')
          .is('read_at', null);

        if (error) {
          console.error('Error fetching unread count:', error);
          return;
        }

        setUnreadCount(data?.length || 0);
      } catch (error) {
        console.error('Error in fetchUnreadCount:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `direction=eq.in`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return unreadCount;
};