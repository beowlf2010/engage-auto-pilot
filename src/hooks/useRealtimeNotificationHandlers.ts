
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import type { RealtimeCallbacks } from '@/types/realtime';

export const useRealtimeNotificationHandlers = (globalCallbacks: RealtimeCallbacks[]) => {
  const { profile } = useAuth();
  const { toast: useToastHook } = useToast();
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
            // Enhanced popup notifications using both toast systems
            
            // Sonner toast for prominent popup
            toast.success(`📱 New message from ${leadName}`, {
              description: newMessage.body?.substring(0, 100) + (newMessage.body?.length > 100 ? '...' : ''),
              duration: 8000,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = `/smart-inbox?leadId=${newMessage.lead_id}`;
                }
              },
              className: 'border-l-4 border-l-blue-500'
            });

            // Shadcn toast as backup
            useToastHook({
              title: `📱 New message from ${leadName}`,
              description: newMessage.body?.substring(0, 100) + (newMessage.body?.length > 100 ? '...' : ''),
              duration: 5000,
            });

            // Browser notification with sound
            if (notificationPermission.current === 'granted') {
              const notification = new Notification(`New message from ${leadName}`, {
                body: newMessage.body?.substring(0, 200) + (newMessage.body?.length > 200 ? '...' : ''),
                icon: '/favicon.ico',
                tag: `message-${newMessage.id}`,
                requireInteraction: true, // Keeps notification until user interacts
              });

              notification.onclick = () => {
                window.focus();
                window.location.href = `/smart-inbox?leadId=${newMessage.lead_id}`;
                notification.close();
              };

              // Auto-close after 10 seconds
              setTimeout(() => notification.close(), 10000);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }, [profile, useToastHook, globalCallbacks]);

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
          // Enhanced email popup notifications
          toast.info(`📧 New email from ${leadName}`, {
            description: payload.new.subject || 'No subject',
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/lead/${payload.new.lead_id}`;
              }
            },
            className: 'border-l-4 border-l-green-500'
          });

          useToastHook({
            title: `📧 New email from ${leadName}`,
            description: payload.new.subject || 'No subject',
            duration: 6000,
          });

          if (notificationPermission.current === 'granted') {
            const notification = new Notification(`New email from ${leadName}`, {
              body: payload.new.subject || 'New email received',
              icon: '/favicon.ico',
              tag: `email-${payload.new.id}`,
              requireInteraction: true,
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = `/lead/${payload.new.lead_id}`;
              notification.close();
            };

            setTimeout(() => notification.close(), 10000);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling email notification:', error);
    }
  }, [profile, useToastHook, globalCallbacks]);

  return {
    handleIncomingMessage,
    handleIncomingEmail,
    requestNotificationPermission,
    notificationPermission: notificationPermission.current
  };
};
