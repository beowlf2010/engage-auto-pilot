import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, BellOff, Settings, Check, Trash2, AlertTriangle, Clock, MessageSquareWarning, Calendar, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

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

const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'urgent_lead':
      return <User className="h-4 w-4 text-blue-500" />;
    case 'overdue_ai':
      return <Clock className="h-4 w-4 text-orange-500" />;
    case 'failed_message':
      return <MessageSquareWarning className="h-4 w-4 text-red-500" />;
    case 'appointment_reminder':
      return <Calendar className="h-4 w-4 text-green-500" />;
    case 'system_alert':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: NotificationItem['priority']) => {
  switch (priority) {
    case 'high':
      return 'border-l-red-500 bg-red-50/50';
    case 'medium':
      return 'border-l-orange-500 bg-orange-50/50';
    case 'low':
      return 'border-l-blue-500 bg-blue-50/50';
    default:
      return 'border-l-gray-500 bg-gray-50/50';
  }
};

export const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    notificationPermission,
    requestNotificationPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useRealtimeNotifications();

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.hash = notification.actionUrl;
    }
  };

  const handlePermissionRequest = async () => {
    await requestNotificationPermission();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount} new
              </Badge>
            )}
          </DropdownMenuLabel>
          
          <div className="flex items-center gap-1">
            {notificationPermission !== 'granted' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePermissionRequest}
                className="h-8 px-2 text-xs"
              >
                <BellOff className="h-3 w-3 mr-1" />
                Enable
              </Button>
            )}
            
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs"
                  disabled={unreadCount === 0}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Read All
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You'll see urgent alerts here</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200
                    hover:bg-muted/50 
                    ${getPriorityColor(notification.priority)}
                    ${!notification.read ? 'bg-muted/30' : 'opacity-75'}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium truncate ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                        
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            notification.priority === 'high' 
                              ? 'border-red-200 text-red-700' 
                              : notification.priority === 'medium' 
                                ? 'border-orange-200 text-orange-700'
                                : 'border-blue-200 text-blue-700'
                          }`}
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notificationPermission !== 'granted' && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BellOff className="h-3 w-3" />
                <span>Enable browser notifications for urgent alerts</span>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};