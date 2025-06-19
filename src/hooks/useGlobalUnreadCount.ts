
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCentralizedRealtime } from './useCentralizedRealtime';

export const useGlobalUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!profile) return;

    try {
      console.log('🔍 [GLOBAL UNREAD COUNT] Fetching unread count for profile:', profile.id);

      // Get unread SMS conversations
      const { data: smsConversations, error: smsError } = await supabase
        .from('conversations')
        .select('lead_id, leads!inner(salesperson_id)')
        .eq('direction', 'in')
        .is('read_at', null);

      if (smsError) throw smsError;

      // Get unread email conversations
      const { data: emailConversations, error: emailError } = await supabase
        .from('email_conversations')
        .select('lead_id, leads!inner(salesperson_id)')
        .eq('direction', 'in')
        .is('read_at', null);

      if (emailError) throw emailError;

      // Filter by assigned leads or unassigned leads
      const smsUnread = smsConversations?.filter(conv => 
        !conv.leads.salesperson_id || conv.leads.salesperson_id === profile.id
      ).length || 0;

      const emailUnread = emailConversations?.filter(conv => 
        !conv.leads.salesperson_id || conv.leads.salesperson_id === profile.id
      ).length || 0;

      const totalUnread = smsUnread + emailUnread;
      
      console.log('📊 [GLOBAL UNREAD COUNT] SMS unread:', smsUnread, 'Email unread:', emailUnread, 'Total:', totalUnread);
      
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('❌ [GLOBAL UNREAD COUNT] Error fetching unread count:', error);
      setUnreadCount(0);
    }
  }, [profile]);

  // Use centralized realtime for updates
  useCentralizedRealtime({
    onUnreadCountUpdate: fetchUnreadCount
  });

  // Listen for manual unread count change events
  useEffect(() => {
    const handleUnreadCountChange = () => {
      console.log('🔄 [GLOBAL UNREAD COUNT] Manual refresh triggered');
      fetchUnreadCount();
    };

    window.addEventListener('unread-count-changed', handleUnreadCountChange);
    
    return () => {
      window.removeEventListener('unread-count-changed', handleUnreadCountChange);
    };
  }, [fetchUnreadCount]);

  // Initial load
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
