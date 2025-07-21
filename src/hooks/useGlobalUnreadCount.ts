
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';

export const useGlobalUnreadCount = () => {
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

      const count = data?.length || 0;
      console.log('📊 [GLOBAL UNREAD] Updated count:', count);
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

    console.log('🔗 [GLOBAL UNREAD] Setting up stable realtime subscription');
    fetchUnreadCount();

    // Subscribe to conversation changes using stable manager
    const unsubscribe = stableRealtimeManager.subscribe({
      id: `global-unread-count-${profile.id}`,
      callback: (payload) => {
        console.log('🔄 [GLOBAL UNREAD] Realtime update received');
        
        // Refresh count for any conversation changes
        if (payload.table === 'conversations') {
          fetchUnreadCount();
        }
      },
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    // Also listen to custom events from other parts of the app
    const handleUnreadCountChanged = () => {
      console.log('🔄 [GLOBAL UNREAD] Custom event received, refreshing count');
      fetchUnreadCount();
    };

    window.addEventListener('unread-count-changed', handleUnreadCountChanged);

    return () => {
      console.log('🔌 [GLOBAL UNREAD] Cleaning up subscription');
      unsubscribe();
      window.removeEventListener('unread-count-changed', handleUnreadCountChanged);
    };
  }, [profile?.id, fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
