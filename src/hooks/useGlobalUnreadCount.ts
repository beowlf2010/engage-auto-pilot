
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
      console.log('🔍 [GLOBAL UNREAD COUNT] Fetching actionable unread count for profile:', profile.id);

      // Get unread SMS conversations with lead information - using left join to include unassigned leads
      const { data: smsConversations, error: smsError } = await supabase
        .from('conversations')
        .select('id, body, lead_id, leads(salesperson_id, status)')
        .eq('direction', 'in')
        .is('read_at', null);

      if (smsError) throw smsError;

      // Get unread email conversations with lead information - using left join to include unassigned leads
      const { data: emailConversations, error: emailError } = await supabase
        .from('email_conversations')
        .select('id, body, lead_id, leads(salesperson_id, status)')
        .eq('direction', 'in')
        .is('read_at', null);

      if (emailError) throw emailError;

      // Define rejection patterns to filter out
      const rejectionPatterns = [
        /\bstop\b/i,
        /\bunsubscribe\b/i,
        /\bnot interested\b/i,
        /\bfound already\b/i,
        /\bbought already\b/i,
        /\balready bought\b/i,
        /\bno thanks\b/i,
        /\bno thank you\b/i,
        /\bremove me\b/i,
        /\bdelete my number\b/i,
        /\bdo not contact\b/i,
        /\bdon't contact\b/i,
        /\bleave me alone\b/i,
        /\bnot looking\b/i,
        /\bwrong number\b/i,
        /\bwho is this\b/i,
        /\bwhat is this\b/i,
        /\bdont text me\b/i,
        /\bdon't text me\b/i
      ];

      // Filter SMS conversations to only actionable ones
      const actionableSmsConversations = smsConversations?.filter(conv => {
        // Exclude messages from leads marked as lost or closed
        if (conv.leads?.status === 'lost' || conv.leads?.status === 'closed') {
          return false;
        }

        // Exclude messages that match rejection patterns
        if (conv.body && rejectionPatterns.some(pattern => pattern.test(conv.body))) {
          return false;
        }

        // Only include messages for assigned leads or unassigned leads (for managers/admins)
        return !conv.leads || !conv.leads.salesperson_id || conv.leads.salesperson_id === profile.id;
      }) || [];

      // Filter email conversations to only actionable ones
      const actionableEmailConversations = emailConversations?.filter(conv => {
        // Exclude messages from leads marked as lost or closed
        if (conv.leads?.status === 'lost' || conv.leads?.status === 'closed') {
          return false;
        }

        // Exclude messages that match rejection patterns
        if (conv.body && rejectionPatterns.some(pattern => pattern.test(conv.body))) {
          return false;
        }

        // Only include messages for assigned leads or unassigned leads (for managers/admins)
        return !conv.leads || !conv.leads.salesperson_id || conv.leads.salesperson_id === profile.id;
      }) || [];

      const smsUnread = actionableSmsConversations.length;
      const emailUnread = actionableEmailConversations.length;
      const totalUnread = smsUnread + emailUnread;
      
      console.log('📊 [GLOBAL UNREAD COUNT] Actionable counts:', {
        smsUnread,
        emailUnread,
        totalUnread,
        filteredOutSms: (smsConversations?.length || 0) - smsUnread,
        filteredOutEmail: (emailConversations?.length || 0) - emailUnread
      });
      
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('❌ [GLOBAL UNREAD COUNT] Error fetching unread count:', error);
      setUnreadCount(0);
    }
  }, [profile]);

  // Use centralized realtime for updates
  useCentralizedRealtime({
    onUnreadCountUpdate: fetchUnreadCount,
    onConversationUpdate: fetchUnreadCount
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
