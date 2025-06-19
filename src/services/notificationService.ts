
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface NotificationData {
  leadId: string;
  conversationId: string;
  customerName: string;
  messageContent: string;
  messagePreview: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private audio: HTMLAudioElement | null = null;

  constructor() {
    this.initializeAudio();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeAudio() {
    try {
      // Create a simple notification sound using Web Audio API
      this.audio = new Audio();
      this.audio.volume = 0.7;
      
      // Simple notification beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Audio notification not available:', error);
    }
  }

  async sendNotifications(data: NotificationData, userId: string) {
    try {
      // Get user notification preferences
      const { data: preferences } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!preferences) {
        console.warn('No notification preferences found for user');
        return;
      }

      // Check if we're within notification hours
      const currentHour = new Date().getHours();
      const withinHours = currentHour >= preferences.notification_hours_start && 
                         currentHour <= preferences.notification_hours_end;

      // Send browser notification
      if (preferences.browser_notifications_enabled && withinHours) {
        this.sendBrowserNotification(data);
      }

      // Send toast notification (always)
      this.sendToastNotification(data);

      // Play sound
      this.playNotificationSound();

      // Send SMS notification
      if (preferences.sms_notifications_enabled && 
          preferences.personal_phone && 
          withinHours) {
        await this.sendSMSNotification(data, preferences.personal_phone, userId);
      }

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  private sendBrowserNotification(data: NotificationData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`New reply from ${data.customerName}`, {
        body: data.messagePreview,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `message-${data.conversationId}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/leads/${data.leadId}`;
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  }

  private sendToastNotification(data: NotificationData) {
    toast({
      title: `🔔 New reply from ${data.customerName}`,
      description: data.messagePreview,
      duration: 8000,
      className: "border-l-4 border-l-blue-500"
    });
  }

  private playNotificationSound() {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  private async sendSMSNotification(data: NotificationData, phoneNumber: string, userId: string) {
    try {
      const smsContent = `🔔 New reply from ${data.customerName}: "${data.messagePreview}" - View: ${window.location.origin}/leads/${data.leadId}`;

      const { data: result, error } = await supabase.functions.invoke('send-user-notification', {
        body: {
          to: phoneNumber,
          message: smsContent,
          leadId: data.leadId,
          conversationId: data.conversationId
        }
      });

      if (error) {
        console.error('Error sending SMS notification:', error);
        return;
      }

      // Log the notification
      await supabase
        .from('notification_log')
        .insert({
          user_id: userId,
          lead_id: data.leadId,
          conversation_id: data.conversationId,
          notification_type: 'sms',
          sent_to: phoneNumber,
          content: smsContent,
          status: result?.success ? 'sent' : 'failed'
        });

    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  // Request notification permission on app start
  static async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

export const notificationService = NotificationService.getInstance();
