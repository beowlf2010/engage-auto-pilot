import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, User, Zap, Clock } from 'lucide-react';
import { useAIAutomationStatus } from '@/hooks/useAIAutomationStatus';
import { formatDistanceToNow } from 'date-fns';

const LiveActivityFeed = () => {
  const { recentActivity, isRunning } = useAIAutomationStatus();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_sent':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'lead_processed':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'automation_started':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'automation_completed':
        return <Zap className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'message_sent':
        return `Sent message to ${activity.leadName}`;
      case 'lead_processed':
        return `Processed lead ${activity.leadName}`;
      case 'automation_started':
        return 'AI automation started';
      case 'automation_completed':
        return 'AI automation completed';
      default:
        return 'Unknown activity';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className={`w-5 h-5 ${isRunning ? 'text-green-500 animate-pulse' : 'text-blue-500'}`} />
          Live Activity Feed
          {isRunning && (
            <Badge variant="secondary" className="ml-auto animate-pulse">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64">
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Clock className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity will appear here when automation runs
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {getActivityDescription(activity)}
                      </p>
                      <Badge 
                        variant={activity.success ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {activity.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    
                    {activity.message && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        "{activity.message}"
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;