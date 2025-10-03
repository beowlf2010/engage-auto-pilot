import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MessageSquare, 
  Mail, 
  Users, 
  Clock, 
  TrendingUp, 
  Info,
  Calendar,
  CalendarDays,
  Database
} from 'lucide-react';
import { OptimizedLoading } from '@/components/ui/OptimizedLoading';

interface EnhancedDashboardStatsProps {
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
  weeklyLeads: Array<{ date: string; count: number }>;
  statsLoading: boolean;
}

type TimeFilter = 'today' | 'week' | 'total';

export const EnhancedDashboardStats = React.memo<EnhancedDashboardStatsProps>(({ 
  messageStats, 
  leadCounts, 
  unreadMessages, 
  weeklyLeads,
  statsLoading 
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  const formatChangeText = (change: number | undefined, defaultText: string) => {
    if (!change || change === 0) return defaultText;
    return (
      <span className={change > 0 ? 'text-success' : 'text-destructive'}>
        {change > 0 ? '+' : ''}{change}% from yesterday
      </span>
    );
  };

  const getWeeklyNewLeads = () => {
    return weeklyLeads.reduce((sum, day) => sum + day.count, 0);
  };

  const getFreshLeads = () => {
    // Calculate leads from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return weeklyLeads.reduce((sum, day) => {
      const dayDate = new Date(day.date);
      return dayDate >= sevenDaysAgo ? sum + day.count : sum;
    }, 0);
  };

  // Show loading state
  if (statsLoading) {
    return <OptimizedLoading variant="stats" />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Modern Time Filter Controls */}
        <div className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <span className="text-sm font-semibold text-foreground">View:</span>
          <div className="flex gap-2">
            {[
              { key: 'today' as const, label: 'Today', icon: Calendar },
              { key: 'week' as const, label: 'This Week', icon: CalendarDays },
              { key: 'total' as const, label: 'Total Database', icon: Database }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={timeFilter === key ? "gradient" : "glass"}
                size="sm"
                onClick={() => setTimeFilter(key)}
                className="text-xs font-medium transition-[var(--transition-smooth)]"
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Modern Stats Grid with Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Messages Sent */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card variant="floating" interactive className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-[100ms]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Messages Sent
                    <Badge variant="glass" className="ml-2 text-xs">
                      {timeFilter === 'today' ? 'Today' : timeFilter === 'week' ? 'Week' : 'Total'}
                    </Badge>
                  </CardTitle>
                  <MessageSquare className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">
                    {timeFilter === 'today' ? (messageStats?.messages_sent || 0) : 
                     timeFilter === 'week' ? '---' : '---'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeFilter === 'today' && formatChangeText(messageStats?.change_sent, "Today's outbound messages")}
                    {timeFilter === 'week' && "Weekly outbound activity"}
                    {timeFilter === 'total' && "All-time sent messages"}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>SMS and messages sent {timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'this week' : 'in total'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Replies Received */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card variant="floating" interactive className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-[200ms]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Replies Received
                    <Badge variant="glass" className="ml-2 text-xs">
                      {timeFilter === 'today' ? 'Today' : timeFilter === 'week' ? 'Week' : 'Total'}
                    </Badge>
                  </CardTitle>
                  <Mail className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">
                    {timeFilter === 'today' ? (messageStats?.replies_in || 0) :
                     timeFilter === 'week' ? '---' : '---'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeFilter === 'today' && formatChangeText(messageStats?.change_replies, "Today's inbound messages")}
                    {timeFilter === 'week' && "Weekly response activity"}
                    {timeFilter === 'total' && "All-time received replies"}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Customer replies received {timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'this week' : 'in total'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Leads Metric - Changes based on filter */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {timeFilter === 'total' ? 'Total Leads' : timeFilter === 'week' ? 'New This Week' : 'Fresh Leads (7d)'}
                    <Info className="h-3 w-3 ml-1 text-muted-foreground" />
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {timeFilter === 'total' ? leadCounts.totalLeads :
                     timeFilter === 'week' ? getWeeklyNewLeads() :
                     getFreshLeads()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeFilter === 'total' && `${leadCounts.aiEnabledLeads} with Finn AI enabled`}
                    {timeFilter === 'week' && "New leads acquired this week"}
                    {timeFilter === 'today' && "Recent lead activity (last 7 days)"}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {timeFilter === 'total' && 'Total number of leads in your database (excluding lost leads)'}
                {timeFilter === 'week' && 'New leads that joined this week'}
                {timeFilter === 'today' && 'Leads acquired in the last 7 days - your fresh pipeline'}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Need Attention */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:shadow-md transition-shadow">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Leads that are still in "new" status and haven't been contacted yet</p>
            </TooltipContent>
          </Tooltip>

          {/* Engaged */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:shadow-md transition-shadow">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Leads currently in active conversation or follow-up</p>
            </TooltipContent>
          </Tooltip>

          {/* Unread Messages */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:shadow-md transition-shadow">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Customer messages that haven't been read yet</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Clarification Notice */}
        <div className="bg-muted/50 border border-border rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Understanding Your Metrics:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Total Database:</strong> All leads in your system (1,048 total)</li>
                <li>• <strong>Fresh Leads:</strong> New leads from the last 7 days</li>
                <li>• <strong>Weekly Activity:</strong> Chart shows daily new lead intake, not total counts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});