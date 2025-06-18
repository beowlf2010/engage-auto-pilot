
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export const useGlobalUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();
  const channelsRef = useRef<any[]>([]);

  const fetchUnreadCount = async () => {
    if (!profile) return;

    try {
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
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const cleanupChannels = () => {
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    });
    channelsRef.current = [];
  };

  useEffect(() => {
    if (!profile) return;

    // Clean up any existing channels first
    cleanupChannels();

    fetchUnreadCount();

    // Subscribe to real-time updates for conversations
    const smsChannel = supabase
      .channel(`conversations-unread-${profile.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    // Subscribe to real-time updates for email conversations
    const emailChannel = supabase
      .channel(`email-conversations-unread-${profile.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_conversations'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    // Store channels for cleanup
    channelsRef.current = [smsChannel, emailChannel];

    return () => {
      cleanupChannels();
    };
  }, [profile?.id]); // Only depend on profile.id to avoid unnecessary re-subscriptions

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
