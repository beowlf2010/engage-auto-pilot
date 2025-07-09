import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Mail, Users, Clock, TrendingUp } from 'lucide-react';
import { OptimizedLoading } from '@/components/ui/OptimizedLoading';

interface DashboardStatsProps {
  messageStats: {
    messages_sent?: number;
    replies_in?: number;
    change_sent?: number;
    change_replies?: number;
  } | null;
  leadCounts: {
    totalLeads: number;
    aiEnabledLeads: number;
    needsAttention: number;
    engagedLeads: number;
  };
  unreadMessages: number;
  statsLoading: boolean;
}

export const DashboardStats = React.memo<DashboardStatsProps>(({ 
  messageStats, 
  leadCounts, 
  unreadMessages, 
  statsLoading 
}) => {
  const formatChangeText = (change: number | undefined, defaultText: string) => {
    if (!change || change === 0) return defaultText;
    return (
      <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
        {change > 0 ? '+' : ''}{change}% from yesterday
      </span>
    );
  };

  // Show loading state
  if (statsLoading) {
    return <OptimizedLoading variant="stats" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {messageStats?.messages_sent || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatChangeText(messageStats?.change_sent, "Today's outbound messages")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Replies Received</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {messageStats?.replies_in || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatChangeText(messageStats?.change_replies, "Today's inbound messages")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{leadCounts.totalLeads}</div>
          <p className="text-xs text-muted-foreground">
            {leadCounts.aiEnabledLeads} with Finn AI enabled
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{leadCounts.needsAttention}</div>
          <p className="text-xs text-muted-foreground">
            New leads not yet contacted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engaged</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{leadCounts.engagedLeads}</div>
          <p className="text-xs text-muted-foreground">
            Active conversations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unreadMessages}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting response
          </p>
        </CardContent>
      </Card>
    </div>
  );
});