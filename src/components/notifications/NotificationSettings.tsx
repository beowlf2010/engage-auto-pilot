import React from 'react';
import { Bell, BellOff, User, Clock, MessageSquareWarning, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export const NotificationSettings = () => {
  const {
    notificationPermission,
    preferences,
    setPreferences,
    requestNotificationPermission,
  } = useRealtimeNotifications();

  const notificationTypes = [
    {
      key: 'urgentLeads' as const,
      icon: <User className="h-4 w-4" />,
      title: 'Urgent Leads',
      description: 'New high-priority leads from phone, website, or referrals',
      color: 'text-blue-500',
    },
    {
      key: 'overdueAI' as const,
      icon: <Clock className="h-4 w-4" />,
      title: 'Overdue AI Messages',
      description: 'AI messages that are past their scheduled send time',
      color: 'text-orange-500',
    },
    {
      key: 'failedMessages' as const,
      icon: <MessageSquareWarning className="h-4 w-4" />,
      title: 'Failed Messages',
      description: 'Messages that failed to deliver to leads',
      color: 'text-red-500',
    },
    {
      key: 'appointments' as const,
      icon: <Calendar className="h-4 w-4" />,
      title: 'Appointment Reminders',
      description: 'Upcoming appointments and scheduling updates',
      color: 'text-green-500',
    },
    {
      key: 'systemAlerts' as const,
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'System Alerts',
      description: 'Important system notifications and warnings',
      color: 'text-yellow-500',
    },
  ];

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure which events trigger real-time notifications
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Browser Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Browser Notifications</h4>
                  <Badge 
                    variant={notificationPermission === 'granted' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {notificationPermission === 'granted' ? 'Enabled' : 
                     notificationPermission === 'denied' ? 'Blocked' : 'Not Set'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show notifications outside the browser window
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {notificationPermission !== 'granted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNotificationPermission}
                    disabled={notificationPermission === 'denied'}
                  >
                    {notificationPermission === 'denied' ? 'Blocked' : 'Enable'}
                  </Button>
                )}
                
                <Switch
                  checked={preferences.browserNotifications && notificationPermission === 'granted'}
                  onCheckedChange={() => handleToggle('browserNotifications')}
                  disabled={notificationPermission !== 'granted'}
                />
              </div>
            </div>

            {notificationPermission === 'denied' && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BellOff className="h-4 w-4" />
                  <span>
                    Browser notifications are blocked. You can enable them in your browser settings.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Individual Notification Types */}
          <div className="space-y-4">
            <h4 className="font-medium">Notification Types</h4>
            
            <div className="space-y-3">
              {notificationTypes.map((type) => (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${type.color}`}>
                      {type.icon}
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-medium text-sm">{type.title}</h5>
                      <p className="text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  
                  <Switch
                    checked={preferences[type.key]}
                    onCheckedChange={() => handleToggle(type.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">About Real-time Notifications</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Notifications appear instantly when events occur</li>
              <li>• High-priority alerts will stay visible longer</li>
              <li>• Browser notifications work even when the tab is inactive</li>
              <li>• All notifications are also shown in the notification panel</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};