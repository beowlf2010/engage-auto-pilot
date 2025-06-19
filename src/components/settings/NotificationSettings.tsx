
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatPhoneNumber, validatePhoneNumber } from '@/services/settingsService';
import { Bell, Phone, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface NotificationPreferences {
  personal_phone: string;
  sms_notifications_enabled: boolean;
  browser_notifications_enabled: boolean;
  notification_hours_start: number;
  notification_hours_end: number;
  digest_enabled: boolean;
  digest_frequency: string;
}

const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    personal_phone: '',
    sms_notifications_enabled: true,
    browser_notifications_enabled: true,
    notification_hours_start: 8,
    notification_hours_end: 19,
    digest_enabled: false,
    digest_frequency: 'daily'
  });

  useEffect(() => {
    if (user) {
      loadNotificationPreferences();
      requestNotificationPermission();
    }
  }, [user]);

  const loadNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          personal_phone: data.personal_phone || '',
          sms_notifications_enabled: data.sms_notifications_enabled,
          browser_notifications_enabled: data.browser_notifications_enabled,
          notification_hours_start: data.notification_hours_start,
          notification_hours_end: data.notification_hours_end,
          digest_enabled: data.digest_enabled,
          digest_frequency: data.digest_frequency
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive browser notifications for new messages"
        });
      }
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    if (preferences.personal_phone && !validatePhoneNumber(preferences.personal_phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const formattedPhone = preferences.personal_phone ? formatPhoneNumber(preferences.personal_phone) : null;

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          personal_phone: formattedPhone,
          sms_notifications_enabled: preferences.sms_notifications_enabled,
          browser_notifications_enabled: preferences.browser_notifications_enabled,
          notification_hours_start: preferences.notification_hours_start,
          notification_hours_end: preferences.notification_hours_end,
          digest_enabled: preferences.digest_enabled,
          digest_frequency: preferences.digest_frequency,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated"
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from AutoVantage',
        icon: '/favicon.ico'
      });
    } else {
      toast({
        title: "Browser Notifications Disabled",
        description: "Please enable browser notifications in your browser settings"
      });
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading notification settings..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="personal-phone" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Personal Phone Number</span>
            </Label>
            <Input
              id="personal-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={preferences.personal_phone}
              onChange={(e) => setPreferences(prev => ({ ...prev, personal_phone: e.target.value }))}
            />
            <p className="text-sm text-gray-500">
              Enter your personal phone number to receive SMS alerts for new customer replies
            </p>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-gray-500">Receive text messages for new customer replies</p>
            </div>
            <Switch
              id="sms-notifications"
              checked={preferences.sms_notifications_enabled}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, sms_notifications_enabled: checked }))}
            />
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="browser-notifications">Browser Notifications</Label>
              <p className="text-sm text-gray-500">Show desktop notifications in your browser</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="browser-notifications"
                checked={preferences.browser_notifications_enabled}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, browser_notifications_enabled: checked }))}
              />
              <Button variant="outline" size="sm" onClick={testNotification}>
                Test
              </Button>
            </div>
          </div>

          {/* Notification Hours */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Notification Hours</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-hour" className="text-sm">Start Hour</Label>
                <Select
                  value={preferences.notification_hours_start.toString()}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, notification_hours_start: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="end-hour" className="text-sm">End Hour</Label>
                <Select
                  value={preferences.notification_hours_end.toString()}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, notification_hours_end: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              You'll only receive notifications during these hours (24-hour format)
            </p>
          </div>

          {/* Digest Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="digest-enabled">Daily Digest</Label>
                <p className="text-sm text-gray-500">Receive a summary of missed messages</p>
              </div>
              <Switch
                id="digest-enabled"
                checked={preferences.digest_enabled}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, digest_enabled: checked }))}
              />
            </div>

            {preferences.digest_enabled && (
              <div>
                <Label htmlFor="digest-frequency" className="text-sm">Digest Frequency</Label>
                <Select
                  value={preferences.digest_frequency}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, digest_frequency: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={savePreferences} disabled={saving} className="w-full">
            {saving ? <LoadingSpinner size="sm" text="Saving..." /> : 'Save Notification Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
