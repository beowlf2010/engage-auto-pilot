
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { UnreadCountService } from '@/services/unreadCountService';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';
import { supabase } from '@/integrations/supabase/client';

export const useUnifiedUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { profile } = useAuth();
  const refreshDebounceRef = useRef<number | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!profile?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 [UNIFIED UNREAD] Fetching unread count for user:', profile.id);
      
      // Fetch actual user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);
      if (rolesError) {
        console.warn('⚠️ [UNIFIED UNREAD] Could not fetch user roles, defaulting to assigned-only:', rolesError);
      }
      const userRoles = rolesData?.map(r => r.role) || [];
      
      const count = await UnreadCountService.getUnreadCount({
        respectUserRole: true,
        userId: profile.id,
        userRoles
      });

      // Get debug info in development
      if (process.env.NODE_ENV === 'development') {
        const debug = await UnreadCountService.getUnreadDebugInfo(profile.id, userRoles);
        setDebugInfo(debug);
      }

      setUnreadCount(count);
    } catch (error) {
      console.error('❌ [UNIFIED UNREAD] Error fetching count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!profile?.id) return;

    console.log('🔗 [UNIFIED UNREAD] Setting up realtime subscription');

    const unsubscribe = stableRealtimeManager.subscribe({
      id: `unified-unread-count-${profile.id}`,
      callback: (payload) => {
        console.log('🔄 [UNIFIED UNREAD] Realtime update received:', payload.eventType);
        
        if (payload.table === 'conversations') {
          // Refresh count for any conversation changes that affect unread status
          if (payload.eventType === 'INSERT' && payload.new?.direction === 'in') {
            console.log('📬 [UNIFIED UNREAD] New incoming message - refreshing count');
            fetchUnreadCount();
          } else if (payload.eventType === 'UPDATE' && 
                     payload.new?.read_at && !payload.old?.read_at) {
            console.log('📖 [UNIFIED UNREAD] Message marked as read - refreshing count');
            fetchUnreadCount();
          }
        }
      },
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    // Also listen for custom events (debounced)
    const handleCustomRefresh = () => {
      console.log('🔄 [UNIFIED UNREAD] Custom refresh event received');
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
      refreshDebounceRef.current = window.setTimeout(() => {
        fetchUnreadCount();
        refreshDebounceRef.current = null;
      }, 250);
    };

    window.addEventListener('unread-count-changed', handleCustomRefresh);

    return () => {
      console.log('🔌 [UNIFIED UNREAD] Cleaning up subscription');
      unsubscribe();
      window.removeEventListener('unread-count-changed', handleCustomRefresh);
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }
    };
  }, [profile?.id, fetchUnreadCount]);

  return { 
    unreadCount, 
    loading, 
    refreshUnreadCount: fetchUnreadCount,
    debugInfo 
  };
};
