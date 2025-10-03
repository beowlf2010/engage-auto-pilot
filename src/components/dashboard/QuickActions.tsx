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

  type Severity = 'none' | 'low' | 'med' | 'high';

  const getSeverityForAction = (title: string, count: number | null): Severity => {
    if (!count || count <= 0) return 'none';
    if (title === 'Smart Inbox') {
      if (count <= 5) return 'low';
      if (count <= 20) return 'med';
      return 'high';
    }
    if (title === 'Leads') {
      if (count <= 3) return 'low';
      if (count <= 10) return 'med';
      return 'high';
    }
    return 'low';
  };

  const badgeVariantForSeverity = (severity: Severity): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'low':
        return 'secondary';
      case 'med':
        return 'default';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
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
    <Card variant="floating" className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="glass"
              className={`h-auto p-4 flex flex-col items-start gap-3 relative hover:scale-[1.03] hover:-translate-y-0.5 transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-floating)] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-[${index * 100}ms]`}
              onClick={action.action}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2.5 rounded-xl ${action.color} text-white shadow-lg`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </div>
              {(() => {
                const severity = getSeverityForAction(action.title, action.badge);
                if (severity === 'none') return null;
                const variant = badgeVariantForSeverity(severity);
                const label = action.title === 'Smart Inbox'
                  ? `${action.badge} unread messages`
                  : action.title === 'Leads'
                  ? `${action.badge} leads need attention`
                  : `${action.badge} notifications`;

                return (
                  <Badge
                    variant={variant === 'default' ? 'gradient' : variant}
                    className="absolute top-2 right-2 h-5 min-w-[1.25rem] px-2 flex items-center justify-center text-[10px] font-bold shadow-sm animate-pulse-glow"
                    role="status"
                    aria-label={label}
                    title={label}
                  >
                    {action.badge}
                  </Badge>
                );
              })()}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});