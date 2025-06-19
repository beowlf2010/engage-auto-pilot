
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import type { RealtimeCallbacks } from '@/types/realtime';

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks = {}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const callbacksRef = useRef<RealtimeCallbacks[]>([]);

  // Store callbacks in ref to avoid subscription churn
  useEffect(() => {
    callbacksRef.current.push(callbacks);
    
    return () => {
      const index = callbacksRef.current.indexOf(callbacks);
      if (index > -1) {
        callbacksRef.current.splice(index, 1);
      }
    };
  }, [callbacks]);

  const handleIncomingMessage = useCallback(async (payload: any) => {
    console.log('🔔 [CENTRALIZED REALTIME] Incoming message detected:', payload);
    
    if (payload.eventType === 'INSERT' && payload.new?.direction === 'in') {
      const message = payload.new;
      
      // Get lead details for notification
      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, salesperson_id')
          .eq('id', message.lead_id)
          .single();

        if (lead) {
          // Only notify if message is for current user or unassigned
          const shouldNotify = !lead.salesperson_id || lead.salesperson_id === profile?.id;
          
          if (shouldNotify && profile?.id) {
            const customerName = `${lead.first_name} ${lead.last_name}`.trim();
            const messagePreview = message.body.length > 100 
              ? message.body.substring(0, 100) + '...' 
              : message.body;

            // Send comprehensive notifications
            await notificationService.sendNotifications({
              leadId: message.lead_id,
              conversationId: message.id,
              customerName,
              messageContent: message.body,
              messagePreview
            }, profile.id);

            // Also fire the unread count update event
            window.dispatchEvent(new CustomEvent('unread-count-changed'));
          }
        }
      } catch (error) {
        console.error('Error getting lead details for notification:', error);
      }
    }

    // Call all registered callbacks
    callbacksRef.current.forEach(cb => {
      if (cb.onConversationUpdate) cb.onConversationUpdate();
      if (cb.onUnreadCountUpdate) cb.onUnreadCountUpdate();
      if (payload.new?.lead_id && cb.onMessageUpdate) {
        cb.onMessageUpdate(payload.new.lead_id);
      }
    });
  }, [profile]);

  const handleEmailNotification = useCallback((payload: any) => {
    console.log('📧 [CENTRALIZED REALTIME] Email notification:', payload);
    
    callbacksRef.current.forEach(cb => {
      if (cb.onEmailNotification) cb.onEmailNotification(payload);
      if (cb.onUnreadCountUpdate) cb.onUnreadCountUpdate();
    });
  }, []);

  const forceRefresh = useCallback(() => {
    console.log('🔄 [CENTRALIZED REALTIME] Force refresh triggered');
    callbacksRef.current.forEach(cb => {
      if (cb.onConversationUpdate) cb.onConversationUpdate();
      if (cb.onUnreadCountUpdate) cb.onUnreadCountUpdate();
    });
  }, []);

  const reconnect = useCallback(() => {
    console.log('🔌 [CENTRALIZED REALTIME] Reconnection requested');
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // The useEffect will recreate the channel
  }, []);

  useEffect(() => {
    if (!profile) return;

    console.log('🔗 [CENTRALIZED REALTIME] Setting up realtime subscriptions for profile:', profile.id);

    // Clean up existing channel
    if (channelRef.current) {
      console.log('🧹 [CENTRALIZED REALTIME] Cleaning up existing channel');
      supabase.removeChannel(channelRef.current);
    }

    // Create new channel
    const channel = supabase
      .channel('centralized-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        handleIncomingMessage
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_conversations'
        },
        handleEmailNotification
      )
      .subscribe((status) => {
        console.log('📡 [CENTRALIZED REALTIME] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 [CENTRALIZED REALTIME] Cleaning up subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile, handleIncomingMessage, handleEmailNotification]);

  return {
    isConnected: !!channelRef.current,
    forceRefresh,
    reconnect
  };
};
