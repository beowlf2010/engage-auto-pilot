import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MessageSquare, CheckCircle } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface RecentActivityProps {
  leadCounts: {
    needsAttention: number;
    aiEnabledLeads: number;
  };
  unreadMessages: number;
  onNavigate: (path: string) => void;
}

export const RecentActivity = React.memo<RecentActivityProps>(({ 
  leadCounts, 
  unreadMessages, 
  onNavigate 
}) => {
  const { handleError } = useErrorHandler();

  const safeNavigate = (path: string) => {
    try {
      onNavigate(path);
    } catch (error) {
      handleError(error, 'navigate');
    }
  };
  const activities = [
    ...(leadCounts.needsAttention > 0 ? [{
      id: 'needs-attention',
      icon: Clock,
      title: `${leadCounts.needsAttention} new leads need attention`,
      description: "These leads haven't been contacted yet",
      action: () => safeNavigate('/leads'),
      actionText: 'Review',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    }] : []),
    ...(unreadMessages > 0 ? [{
      id: 'unread-messages',
      icon: MessageSquare,
      title: `${unreadMessages} unread messages`,
      description: 'Customer inquiries awaiting response',
      action: () => safeNavigate('/smart-inbox'),
      actionText: 'View',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    }] : []),
    {
      id: 'ai-working',
      icon: CheckCircle,
      title: 'AI automation working',
      description: `${leadCounts.aiEnabledLeads} leads have Finn AI enabled and are being nurtured`,
      action: () => safeNavigate('/ai-monitor'),
      actionText: 'Monitor',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className={`flex items-center gap-3 p-3 ${activity.bgColor} rounded-lg`}>
              <activity.icon className={`w-5 h-5 ${activity.iconColor}`} />
              <div className="flex-1">
                <p className="font-medium">{activity.title}</p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={activity.action}>
                {activity.actionText}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});