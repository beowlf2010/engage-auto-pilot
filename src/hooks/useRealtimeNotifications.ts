
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface IncomingMessage {
  id: string;
  lead_id: string;
  direction: 'in' | 'out';
  body: string;
  sent_at: string;
}

export const useRealtimeNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const notificationPermission = useRef<NotificationPermission>('default');
  const channelRef = useRef<any>(null);

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

  // Set up realtime listener for incoming messages
  useEffect(() => {
    if (!profile) return;

    // Cleanup existing channel
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing existing notification channel:', error);
      }
    }

    // Create new channel with unique name
    const channel = supabase
      .channel(`incoming-messages-${profile.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: 'direction=eq.in'
        },
        async (payload) => {
          const newMessage = payload.new as IncomingMessage;
          console.log('New incoming message notification:', newMessage);

          // Get lead information for the notification
          const { data: leadData } = await supabase
            .from('leads')
            .select('first_name, last_name, salesperson_id')
            .eq('id', newMessage.lead_id)
            .single();

          if (leadData) {
            const leadName = `${leadData.first_name} ${leadData.last_name}`;
            
            // Check if this message is for the current user or if they're a manager/admin
            const isForCurrentUser = leadData.salesperson_id === profile.id || 
                                   !leadData.salesperson_id ||
                                   profile.role === 'manager' || 
                                   profile.role === 'admin';

            if (isForCurrentUser) {
              // Show toast notification
              toast({
                title: `New message from ${leadName}`,
                description: newMessage.body.substring(0, 100) + (newMessage.body.length > 100 ? '...' : ''),
                duration: 5000,
              });

              // Show browser notification if permission granted
              if (notificationPermission.current === 'granted') {
                const notification = new Notification(`New message from ${leadName}`, {
                  body: newMessage.body.substring(0, 200) + (newMessage.body.length > 200 ? '...' : ''),
                  icon: '/favicon.ico',
                  tag: `message-${newMessage.id}`,
                });

                // Handle notification click
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };

                // Auto-close after 5 seconds
                setTimeout(() => notification.close(), 5000);
              }
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.error('Error removing notification channel:', error);
        }
      }
    };
  }, [profile, toast]);

  return {
    notificationPermission: notificationPermission.current
  };
};
