
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { UnreadCountService } from '@/services/unreadCountService';
import { stableRealtimeManager } from '@/services/stableRealtimeManager';

export const useGlobalUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      console.log('🔍 [GLOBAL UNREAD] Querying conversations for unread count...');
      
      // Use the unified service with proper role filtering
      const userRoles: string[] = []; // Count only leads assigned to this user (treat as non-admin/manager)
      
      const count = await UnreadCountService.getUnreadCount({
        respectUserRole: true,
        userId: profile.id,
        userRoles
      });

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

    console.log('🔗 [GLOBAL UNREAD] Setting up enhanced realtime subscription');
    fetchUnreadCount();

    // Subscribe to conversation changes using stable manager
    const unsubscribe = stableRealtimeManager.subscribe({
      id: `global-unread-count-${profile.id}`,
      callback: (payload) => {
        console.log('🔄 [GLOBAL UNREAD] Realtime update received:', payload.eventType);
        
        // Enhanced: Refresh count for any conversation changes that affect unread status
        if (payload.table === 'conversations') {
          if (payload.eventType === 'INSERT' && payload.new?.direction === 'in') {
            console.log('📬 [GLOBAL UNREAD] New incoming message - refreshing count');
            fetchUnreadCount();
          } else if (payload.eventType === 'UPDATE' && 
                     payload.new?.read_at && !payload.old?.read_at) {
            console.log('📖 [GLOBAL UNREAD] Message marked as read - refreshing count');
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

    // Enhanced: More responsive custom event listener
    const handleUnreadCountChanged = () => {
      console.log('🔄 [GLOBAL UNREAD] Custom event received, refreshing count immediately');
      fetchUnreadCount();
    };

    window.addEventListener('unread-count-changed', handleUnreadCountChanged);

    // Enhanced: Periodic refresh every 30 seconds to ensure accuracy
    const intervalId = setInterval(() => {
      console.log('⏰ [GLOBAL UNREAD] Periodic refresh triggered');
      fetchUnreadCount();
    }, 30000);

    return () => {
      console.log('🔌 [GLOBAL UNREAD] Cleaning up enhanced subscription');
      unsubscribe();
      window.removeEventListener('unread-count-changed', handleUnreadCountChanged);
      clearInterval(intervalId);
    };
  }, [profile?.id, fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
