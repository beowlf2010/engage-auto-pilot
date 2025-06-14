
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export const useInboxNotifications = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
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

  useEffect(() => {
    if (!profile) return;

    // Setup realtime channel for email conversations
    const channel = supabase
      .channel(`email-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_conversations',
          filter: 'direction=eq.in'
        },
        async (payload) => {
          console.log('New inbound email received:', payload);
          
          try {
            // Get lead information
            const { data: leadData } = await supabase
              .from('leads')
              .select('first_name, last_name, salesperson_id')
              .eq('id', payload.new.lead_id)
              .single();

            if (leadData) {
              const leadName = `${leadData.first_name} ${leadData.last_name}`;
              
              // Check if this email is for the current user
              const isForCurrentUser = leadData.salesperson_id === profile.id || 
                                     !leadData.salesperson_id ||
                                     profile.role === 'manager' || 
                                     profile.role === 'admin';

              if (isForCurrentUser) {
                // Show toast notification
                toast({
                  title: `📧 New email from ${leadName}`,
                  description: payload.new.subject || 'No subject',
                  duration: 6000,
                });

                // Show browser notification if permitted
                if (notificationPermission.current === 'granted') {
                  const notification = new Notification(`New email from ${leadName}`, {
                    body: payload.new.subject || 'New email received',
                    icon: '/favicon.ico',
                    tag: `email-${payload.new.id}`,
                  });

                  notification.onclick = () => {
                    window.focus();
                    // Navigate to lead detail page
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
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [profile, toast]);

  return {
    notificationPermission: notificationPermission.current
  };
};
