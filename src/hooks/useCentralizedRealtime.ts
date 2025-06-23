
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import { useRealtimeChannelManager } from './useRealtimeChannelManager';
import type { RealtimeCallbacks } from '@/types/realtime';

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks = {}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const callbacksRef = useRef<RealtimeCallbacks>(callbacks);
  const { addCallbacks, removeCallbacks, createChannel, cleanupChannel, isSubscribed } = useRealtimeChannelManager();

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
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
            console.log('🔄 [CENTRALIZED REALTIME] Triggering unread count refresh for new message');
            window.dispatchEvent(new CustomEvent('unread-count-changed'));
          }
        }
      } catch (error) {
        console.error('Error getting lead details for notification:', error);
      }
    }

    // Handle read_at updates (messages marked as read)
    if (payload.eventType === 'UPDATE' && payload.new?.read_at && !payload.old?.read_at) {
      console.log('🔄 [CENTRALIZED REALTIME] Message marked as read, triggering unread count refresh');
      window.dispatchEvent(new CustomEvent('unread-count-changed'));
    }

    // Call the current callbacks
    const currentCallbacks = callbacksRef.current;
    if (currentCallbacks.onConversationUpdate) currentCallbacks.onConversationUpdate();
    if (currentCallbacks.onUnreadCountUpdate) currentCallbacks.onUnreadCountUpdate();
    if (payload.new?.lead_id && currentCallbacks.onMessageUpdate) {
      currentCallbacks.onMessageUpdate(payload.new.lead_id);
    }
  }, [profile]);

  const handleEmailNotification = useCallback((payload: any) => {
    console.log('📧 [CENTRALIZED REALTIME] Email notification:', payload);
    
    const currentCallbacks = callbacksRef.current;
    if (currentCallbacks.onEmailNotification) currentCallbacks.onEmailNotification(payload);
    if (currentCallbacks.onUnreadCountUpdate) currentCallbacks.onUnreadCountUpdate();
  }, []);

  const forceRefresh = useCallback(() => {
    console.log('🔄 [CENTRALIZED REALTIME] Force refresh triggered');
    const currentCallbacks = callbacksRef.current;
    if (currentCallbacks.onConversationUpdate) currentCallbacks.onConversationUpdate();
    if (currentCallbacks.onUnreadCountUpdate) currentCallbacks.onUnreadCountUpdate();
  }, []);

  const reconnect = useCallback(() => {
    console.log('🔌 [CENTRALIZED REALTIME] Reconnection requested');
    // Remove and recreate the channel
    if (profile) {
      createChannel(profile, handleIncomingMessage, handleEmailNotification);
    }
  }, [profile, handleIncomingMessage, handleEmailNotification, createChannel]);

  useEffect(() => {
    if (!profile) return;

    console.log('🔗 [CENTRALIZED REALTIME] Setting up realtime subscriptions for profile:', profile.id);

    // Add our callbacks to the global manager
    addCallbacks(callbacks);

    // Create the channel if it doesn't exist
    createChannel(profile, handleIncomingMessage, handleEmailNotification);

    return () => {
      console.log('🔌 [CENTRALIZED REALTIME] Cleaning up subscriptions');
      // Remove our callbacks
      removeCallbacks(callbacks);
      // Clean up the channel if no more callbacks
      cleanupChannel();
    };
  }, [profile, callbacks, addCallbacks, removeCallbacks, createChannel, cleanupChannel, handleIncomingMessage, handleEmailNotification]);

  return {
    isConnected: isSubscribed(),
    forceRefresh,
    reconnect
  };
};
