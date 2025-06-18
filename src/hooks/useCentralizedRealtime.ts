
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface RealtimeCallbacks {
  onConversationUpdate?: () => void;
  onMessageUpdate?: (leadId: string) => void;
  onEmailNotification?: (payload: any) => void;
  onUnreadCountUpdate?: () => void;
}

export const useCentralizedRealtime = (callbacks: RealtimeCallbacks = {}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const notificationPermission = useRef<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        notificationPermission.current = permission;
      }
    };
    requestPermission();
  }, []);

  const handleIncomingMessage = useCallback(async (payload: any) => {
    const newMessage = payload.new;
    console.log('New incoming message:', newMessage);

    try {
      // Call conversation update callback
      if (callbacks.onConversationUpdate) {
        callbacks.onConversationUpdate();
      }

      // Call message update callback for specific lead
      if (callbacks.onMessageUpdate) {
        callbacks.onMessageUpdate(newMessage.lead_id);
      }

      // Call unread count update callback
      if (callbacks.onUnreadCountUpdate) {
        callbacks.onUnreadCountUpdate();
      }

      // Handle notifications for incoming messages
      if (newMessage.direction === 'in') {
        const { data: leadData } = await supabase
          .from('leads')
          .select('first_name, last_name, salesperson_id')
          .eq('id', newMessage.lead_id)
          .single();

        if (leadData) {
          const leadName = `${leadData.first_name} ${leadData.last_name}`;
          
          const isForCurrentUser = leadData.salesperson_id === profile?.id || 
                                 !leadData.salesperson_id ||
                                 profile?.role === 'manager' || 
                                 profile?.role === 'admin';

          if (isForCurrentUser) {
            toast({
              title: `📱 New message from ${leadName}`,
              description: newMessage.body.substring(0, 100) + (newMessage.body.length > 100 ? '...' : ''),
              duration: 5000,
            });

            // Browser notification
            if (notificationPermission.current === 'granted') {
              const notification = new Notification(`New message from ${leadName}`, {
                body: newMessage.body.substring(0, 200) + (newMessage.body.length > 200 ? '...' : ''),
                icon: '/favicon.ico',
                tag: `message-${newMessage.id}`,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };

              setTimeout(() => notification.close(), 5000);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }, [callbacks, profile, toast]);

  const handleIncomingEmail = useCallback(async (payload: any) => {
    console.log('New inbound email received:', payload);
    
    try {
      // Call email notification callback
      if (callbacks.onEmailNotification) {
        callbacks.onEmailNotification(payload);
      }

      // Call unread count update callback
      if (callbacks.onUnreadCountUpdate) {
        callbacks.onUnreadCountUpdate();
      }

      // Get lead information
      const { data: leadData } = await supabase
        .from('leads')
        .select('first_name, last_name, salesperson_id')
        .eq('id', payload.new.lead_id)
        .single();

      if (leadData) {
        const leadName = `${leadData.first_name} ${leadData.last_name}`;
        
        const isForCurrentUser = leadData.salesperson_id === profile?.id || 
                               !leadData.salesperson_id ||
                               profile?.role === 'manager' || 
                               profile?.role === 'admin';

        if (isForCurrentUser) {
          toast({
            title: `📧 New email from ${leadName}`,
            description: payload.new.subject || 'No subject',
            duration: 6000,
          });

          if (notificationPermission.current === 'granted') {
            const notification = new Notification(`New email from ${leadName}`, {
              body: payload.new.subject || 'New email received',
              icon: '/favicon.ico',
              tag: `email-${payload.new.id}`,
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = `/lead/${payload.new.lead_id}`;
              notification.close();
            };

            setTimeout(() => notification.close(), 8000);
          }
        }
      }
    } catch (error) {
      console.error('Error handling email notification:', error);
    }
  }, [callbacks, profile, toast]);

  useEffect(() => {
    if (!profile) return;

    // Clean up existing channel
    if (channelRef.current) {
      try {
        console.log('Removing existing centralized realtime channel');
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing existing centralized realtime channel:', error);
      }
      channelRef.current = null;
    }

    const channelName = `centralized-realtime-${profile.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      // SMS conversations
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations'
      }, handleIncomingMessage)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, handleIncomingMessage)
      // Email conversations
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'email_conversations',
        filter: 'direction=eq.in'
      }, handleIncomingEmail);

    channel.subscribe((status) => {
      console.log('Centralized realtime channel status:', status);
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        console.log('Centralized realtime channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Centralized realtime channel error');
        channelRef.current = null;
      } else if (status === 'CLOSED') {
        console.log('Centralized realtime channel closed');
        channelRef.current = null;
      }
    });

    return () => {
      if (channelRef.current) {
        try {
          console.log('Cleaning up centralized realtime channel');
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.error('Error removing centralized realtime channel:', error);
        }
      }
    };
  }, [profile?.id, handleIncomingMessage, handleIncomingEmail]);

  return {
    notificationPermission: notificationPermission.current
  };
};
