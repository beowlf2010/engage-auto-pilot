import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface NotificationItem {
  id: string;
  type: 'urgent_lead' | 'overdue_ai' | 'failed_message' | 'appointment_reminder' | 'system_alert';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  actionUrl?: string;
  leadId?: string;
  read: boolean;
}

interface NotificationPreferences {
  browserNotifications: boolean;
  urgentLeads: boolean;
  overdueAI: boolean;
  failedMessages: boolean;
  appointments: boolean;
  systemAlerts: boolean;
}

export const useRealtimeNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    browserNotifications: true,
    urgentLeads: true,
    overdueAI: true,
    failedMessages: true,
    appointments: true,
    systemAlerts: true,
  });
  
  const channelsRef = useRef<{ [key: string]: any }>({});

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: NotificationItem) => {
    if (notificationPermission === 'granted' && preferences.browserNotifications) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.hash = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for non-high priority
      if (notification.priority !== 'high') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    }
  }, [notificationPermission, preferences.browserNotifications]);

  // Show toast notification
  const showToastNotification = useCallback((notification: NotificationItem) => {
    const variant = notification.priority === 'high' ? 'destructive' : 'default';
    
    toast({
      title: notification.title,
      description: notification.message,
      variant,
      duration: notification.priority === 'high' ? 10000 : 5000,
    });
  }, [toast]);

  // Add new notification
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Show notifications based on type and preferences
    const shouldShow = {
      urgent_lead: preferences.urgentLeads,
      overdue_ai: preferences.overdueAI,
      failed_message: preferences.failedMessages,
      appointment_reminder: preferences.appointments,
      system_alert: preferences.systemAlerts,
    }[notification.type];

    if (shouldShow) {
      showToastNotification(newNotification);
      showBrowserNotification(newNotification);
    }
  }, [preferences, showToastNotification, showBrowserNotification]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Set up realtime listeners
  useEffect(() => {
    if (!profile) return;

    console.log('🔔 Setting up realtime notifications...');

    // Leads channel - listen for new urgent leads and status changes
    const leadsChannel = supabase
      .channel('leads-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `source=in.(phone,website,referral)` // High-priority sources
        },
        (payload) => {
          const lead = payload.new;
          if (preferences.urgentLeads) {
            addNotification({
              type: 'urgent_lead',
              title: 'New Urgent Lead',
              message: `${lead.first_name} ${lead.last_name} from ${lead.source}`,
              priority: 'high',
              actionUrl: `#/leads`,
              leadId: lead.id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `next_ai_send_at=lt.${new Date().toISOString()}`
        },
        (payload) => {
          const lead = payload.new;
          if (preferences.overdueAI && lead.ai_opt_in && lead.next_ai_send_at) {
            const overdueDate = new Date(lead.next_ai_send_at);
            if (overdueDate < new Date()) {
              addNotification({
                type: 'overdue_ai',
                title: 'Overdue AI Message',
                message: `${lead.first_name} ${lead.last_name} - AI message overdue`,
                priority: 'medium',
                actionUrl: `#/conversations`,
                leadId: lead.id,
              });
            }
          }
        }
      )
      .subscribe();

    // Conversations channel - listen for failed messages
    const conversationsChannel = supabase
      .channel('conversations-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `status=eq.failed`
        },
        (payload) => {
          const conversation = payload.new;
          if (preferences.failedMessages) {
            addNotification({
              type: 'failed_message',
              title: 'Message Delivery Failed',
              message: `Failed to send message to lead`,
              priority: 'high',
              actionUrl: `#/conversations`,
              leadId: conversation.lead_id,
            });
          }
        }
      )
      .subscribe();

    // Appointments channel - listen for upcoming appointments
    const appointmentsChannel = supabase
      .channel('appointments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          const appointment = payload.new;
          if (preferences.appointments) {
            const appointmentDate = new Date(appointment.scheduled_at);
            const now = new Date();
            const timeDiff = appointmentDate.getTime() - now.getTime();
            const hoursUntil = Math.round(timeDiff / (1000 * 60 * 60));

            if (hoursUntil <= 24 && hoursUntil > 0) {
              addNotification({
                type: 'appointment_reminder',
                title: 'Upcoming Appointment',
                message: `${appointment.title} in ${hoursUntil} hours`,
                priority: hoursUntil <= 2 ? 'high' : 'medium',
                actionUrl: `#/appointments`,
              });
            }
          }
        }
      )
      .subscribe();

    channelsRef.current = {
      leads: leadsChannel,
      conversations: conversationsChannel,
      appointments: appointmentsChannel,
    };

    // Initialize notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      console.log('🔔 Cleaning up notification channels...');
      Object.values(channelsRef.current).forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      channelsRef.current = {};
    };
  }, [profile, preferences, addNotification]);

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    notificationPermission,
    preferences,
    setPreferences,
    requestNotificationPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
    addNotification, // For manual testing
  };
};