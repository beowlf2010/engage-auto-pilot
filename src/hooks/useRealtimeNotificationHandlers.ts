
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeCallbacks } from '@/types/realtime';

export const useRealtimeNotificationHandlers = (globalCallbacks: RealtimeCallbacks[]) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const notificationPermission = useRef<NotificationPermission>('default');

  // Request notification permission on mount
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      notificationPermission.current = permission;
    }
  }, []);

  const handleIncomingMessage = useCallback(async (payload: any) => {
    console.log('🔔 Raw payload received:', payload);
    
    // Handle different payload structures safely
    const newMessage = payload.new || payload;
    
    if (!newMessage) {
      console.warn('⚠️ No message data in payload:', payload);
      return;
    }

    console.log('🔔 Processing message:', {
      id: newMessage.id,
      direction: newMessage.direction,
      leadId: newMessage.lead_id,
      body: newMessage.body?.substring(0, 50) + '...'
    });

    try {
      // Call all registered callbacks immediately for any conversation change
      console.log('📞 Calling callbacks for', globalCallbacks.length, 'subscribers');
      globalCallbacks.forEach((cb, index) => {
        console.log(`📞 Calling callback ${index + 1}`);
        if (cb.onConversationUpdate) {
          cb.onConversationUpdate();
        }
        if (cb.onMessageUpdate && newMessage.lead_id) {
          cb.onMessageUpdate(newMessage.lead_id);
        }
        if (cb.onUnreadCountUpdate) {
          cb.onUnreadCountUpdate();
        }
      });

      // Handle notifications for incoming messages only
      if (newMessage.direction === 'in') {
        console.log('📩 Processing incoming message notification');
        
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
              description: newMessage.body?.substring(0, 100) + (newMessage.body?.length > 100 ? '...' : ''),
              duration: 5000,
            });

            // Browser notification
            if (notificationPermission.current === 'granted') {
              const notification = new Notification(`New message from ${leadName}`, {
                body: newMessage.body?.substring(0, 200) + (newMessage.body?.length > 200 ? '...' : ''),
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
      console.error('❌ Error handling incoming message:', error);
    }
  }, [profile, toast, globalCallbacks]);

  const handleIncomingEmail = useCallback(async (payload: any) => {
    console.log('📧 New inbound email received:', payload);
    
    try {
      // Call all registered callbacks
      globalCallbacks.forEach(cb => {
        if (cb.onEmailNotification) {
          cb.onEmailNotification(payload);
        }
        if (cb.onUnreadCountUpdate) {
          cb.onUnreadCountUpdate();
        }
      });

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
      console.error('❌ Error handling email notification:', error);
    }
  }, [profile, toast, globalCallbacks]);

  return {
    handleIncomingMessage,
    handleIncomingEmail,
    requestNotificationPermission,
    notificationPermission: notificationPermission.current
  };
};
