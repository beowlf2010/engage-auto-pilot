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

      // Define comprehensive rejection patterns to filter out
      const rejectionPatterns = [
        // Basic rejections
        /stop/i,
        /unsubscribe/i,
        /not interested/i,
        /no thanks/i,
        /no thank you/i,
        /remove me/i,
        /delete my number/i,
        /do not contact/i,
        /don't contact/i,
        /dont contact/i,
        /leave me alone/i,
        /wrong number/i,
        
        // Already purchased variations
        /found already/i,
        /bought already/i,
        /already bought/i,
        /already purchased/i,
        /purchased already/i,
        /just bought/i,
        /we bought/i,
        /we purchased/i,
        /got a/i,
        /picked up a/i,
        /found one/i,
        /found a vehicle/i,
        /purchased from/i,
        /bought from/i,
        /decided on another/i,
        /chose another/i,
        /went with another/i,
        
        // Not in market
        /not in the market/i,
        /not buying/i,
        /not looking/i,
        /not ready/i,
        /maybe later/i,
        /in the future/i,
        /next year/i,
        /couple months/i,
        /few months/i,
        /check back/i,
        /will check back/i,
        /not ready yet/i,
        /maybe in a/i,
        
        // Confused/Wrong contact
        /who is this/i,
        /what is this/i,
        /what car lot/i,
        /dont text me/i,
        /don't text me/i,
        /bad experience/i,
        /can't use y'all/i,
        
        // Single word rejections (when they're standalone)
        /^stop$/i,
        /^no$/i,
        /^nope$/i,
        
        // Working on getting ready (timing objections)
        /working on getting/i,
        /getting ready/i,
        /house ready/i,
        /getting my house/i,
        /working on my house/i,
        /house situation/i,
        /personal situation/i,
        /family situation/i,
        /moving/i,
        /relocating/i,
        
        // Decision made
        /decided not to/i,
        /not purchasing/i,
        /changed my mind/i,
        /not interested anymore/i,
        /at this time/i
      ];

      // Filter SMS conversations to only actionable ones
      const actionableSmsConversations = smsConversations?.filter(conv => {
        // Exclude messages from leads marked as lost or closed
        if (conv.leads?.status === 'lost' || conv.leads?.status === 'closed') {
          console.log('📋 [FILTER] Excluding SMS from closed/lost lead:', conv.lead_id);
          return false;
        }

        // Exclude messages that match rejection patterns
        if (conv.body && rejectionPatterns.some(pattern => pattern.test(conv.body))) {
          console.log('📋 [FILTER] Excluding rejection SMS:', conv.body.substring(0, 50) + '...');
          return false;
        }

        // Only include messages for assigned leads or unassigned leads (for managers/admins)
        return !conv.leads || !conv.leads.salesperson_id || conv.leads.salesperson_id === profile.id;
      }) || [];

      // Filter email conversations to only actionable ones
      const actionableEmailConversations = emailConversations?.filter(conv => {
        // Exclude messages from leads marked as lost or closed
        if (conv.leads?.status === 'lost' || conv.leads?.status === 'closed') {
          console.log('📋 [FILTER] Excluding email from closed/lost lead:', conv.lead_id);
          return false;
        }

        // Exclude messages that match rejection patterns
        if (conv.body && rejectionPatterns.some(pattern => pattern.test(conv.body))) {
          console.log('📋 [FILTER] Excluding rejection email:', conv.body.substring(0, 50) + '...');
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
      
      // Log some examples of what we're keeping vs filtering out
      if (smsConversations && smsConversations.length > 0) {
        console.log('📋 [FILTER EXAMPLES] First few actionable SMS messages:');
        actionableSmsConversations.slice(0, 3).forEach(conv => {
          console.log('  ✅ KEEPING:', conv.body?.substring(0, 50) + '...');
        });
      }
      
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
