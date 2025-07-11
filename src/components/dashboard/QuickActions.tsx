import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Calendar
} from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  badge: number | null;
  color: string;
}

interface QuickActionsProps {
  unreadMessages: number;
  needsAttention: number;
  onNavigate: (path: string) => void;
}

export const QuickActions = React.memo<QuickActionsProps>(({ 
  unreadMessages, 
  needsAttention, 
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
  const quickActions: QuickAction[] = [
    {
      title: 'Smart Inbox',
      description: 'View and respond to messages',
      icon: MessageSquare,
      action: () => safeNavigate('/smart-inbox'),
      badge: unreadMessages > 0 ? unreadMessages : null,
      color: 'bg-blue-500'
    },
    {
      title: 'Leads',
      description: 'Manage your leads',
      icon: Users,
      action: () => safeNavigate('/leads'),
      badge: needsAttention > 0 ? needsAttention : null,
      color: 'bg-green-500'
    },
    {
      title: 'AI Monitor',
      description: 'Advanced AI analytics',
      icon: TrendingUp,
      action: () => safeNavigate('/ai-monitor'),
      badge: null,
      color: 'bg-purple-500'
    },
    {
      title: 'Schedule',
      description: 'View appointments',
      icon: Calendar,
      action: () => safeNavigate('/schedule'),
      badge: null,
      color: 'bg-orange-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-3 relative hover:bg-accent transition-colors"
              onClick={action.action}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </div>
              {action.badge && (
                <Badge className="absolute top-2 right-2" variant="destructive">
                  {action.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});