
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  UserPlus, 
  Edit, 
  Phone, 
  Mail, 
  Bot, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ActivityTimelineItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ActivityTimelineProps {
  activities: ActivityTimelineItem[];
  isLoading?: boolean;
}

const getActivityIcon = (type: string) => {
  const iconClass = "w-4 h-4";
  
  switch (type) {
    case 'lead_created':
      return <UserPlus className={`${iconClass} text-green-600`} />;
    case 'message_sent':
      return <MessageSquare className={`${iconClass} text-blue-600`} />;
    case 'message_received':
      return <MessageSquare className={`${iconClass} text-purple-600`} />;
    case 'ai_message_sent':
      return <Bot className={`${iconClass} text-indigo-600`} />;
    case 'status_changed':
      return <Edit className={`${iconClass} text-orange-600`} />;
    case 'phone_call':
      return <Phone className={`${iconClass} text-green-600`} />;
    case 'email_sent':
      return <Mail className={`${iconClass} text-blue-600`} />;
    case 'email_opened':
      return <Mail className={`${iconClass} text-green-600`} />;
    case 'appointment_scheduled':
      return <Calendar className={`${iconClass} text-purple-600`} />;
    case 'engagement_increased':
      return <TrendingUp className={`${iconClass} text-green-600`} />;
    case 'ai_opted_in':
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    case 'ai_opted_out':
      return <AlertCircle className={`${iconClass} text-red-600`} />;
    default:
      return <AlertCircle className={`${iconClass} text-gray-600`} />;
  }
};

const getActivityBadgeColor = (type: string) => {
  switch (type) {
    case 'lead_created':
    case 'ai_opted_in':
      return 'bg-green-100 text-green-800';
    case 'message_sent':
    case 'email_sent':
      return 'bg-blue-100 text-blue-800';
    case 'message_received':
    case 'email_opened':
      return 'bg-purple-100 text-purple-800';
    case 'ai_message_sent':
      return 'bg-indigo-100 text-indigo-800';
    case 'status_changed':
      return 'bg-orange-100 text-orange-800';
    case 'phone_call':
    case 'engagement_increased':
      return 'bg-green-100 text-green-800';
    case 'ai_opted_out':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatActivityType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ActivityTimelineComponent: React.FC<ActivityTimelineProps> = ({
  activities,
  isLoading = false
}) => {
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Activity Timeline</span>
          <Badge variant="outline">{activities.length} events</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          <div className="space-y-4 pb-4">
            {sortedActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity yet</p>
                <p className="text-sm">Activity will appear here as you interact with this lead</p>
              </div>
            ) : (
              sortedActivities.map((activity, index) => (
                <div key={activity.id} className="flex items-start space-x-3 relative">
                  {/* Timeline line */}
                  {index < sortedActivities.length - 1 && (
                    <div className="absolute left-4 top-8 w-px h-6 bg-gray-200"></div>
                  )}
                  
                  {/* Activity icon */}
                  <Avatar className="w-8 h-8 border-2 border-background shadow-sm">
                    <AvatarFallback className="bg-white">
                      {getActivityIcon(activity.type)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Activity content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getActivityBadgeColor(activity.type)}`}
                      >
                        {formatActivityType(activity.type)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{format(new Date(activity.timestamp), 'MMM d, h:mm a')}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                    
                    {/* Additional metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <span className="font-medium">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityTimelineComponent;
