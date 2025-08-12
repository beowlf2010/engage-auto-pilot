import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendsWidgetProps {
  trends: {
    weeklyLeads: Array<{ date: string; count: number }>;
    weeklyMessages: Array<{ date: string; sent: number; received: number }>;
    conversionRate: number;
    responseRate: number;
  };
  loading?: boolean;
}

export const TrendsWidget: React.FC<TrendsWidgetProps> = ({ trends, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends & Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const totalLeadsThisWeek = trends.weeklyLeads.reduce((sum, day) => sum + day.count, 0);
  const totalMessagesThisWeek = trends.weeklyMessages.reduce((sum, day) => sum + day.sent, 0);
  
  // Calculate week-over-week changes (simplified)
  const recentLeads = trends.weeklyLeads.slice(-3).reduce((sum, day) => sum + day.count, 0);
  const earlierLeads = trends.weeklyLeads.slice(0, 3).reduce((sum, day) => sum + day.count, 0);
  const leadsChange = earlierLeads > 0 ? ((recentLeads - earlierLeads) / earlierLeads) * 100 : 0;

  const rawLeads = Array.isArray(trends.weeklyLeads) ? trends.weeklyLeads : [];
  const rawMsgs = Array.isArray(trends.weeklyMessages) ? trends.weeklyMessages : [];
  const sanitizedLeads = rawLeads
    .filter((d) => d && typeof d.count === 'number' && !Number.isNaN(d.count))
    .map((d) => ({ ...d, count: Math.max(0, d.count) }));
  const sanitizedMsgs = rawMsgs.map((d) => ({
    date: d?.date,
    sent: Math.max(0, Number(d?.sent || 0)),
    received: Math.max(0, Number(d?.received || 0)),
  }));
  const chartData = sanitizedLeads.map((day, index) => ({
    date: formatDate(day.date),
    leads: day.count,
    sent: sanitizedMsgs[index]?.sent || 0,
    received: sanitizedMsgs[index]?.received || 0,
  }));
  if (import.meta.env.DEV) {
    console.debug('[TrendsWidget] chartData points:', chartData.length);
  }
  const hasEnoughData = chartData.length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Trends & Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Response Rate</span>
              <Badge variant={trends.responseRate > 30 ? 'default' : 'secondary'}>
                {trends.responseRate}%
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {trends.responseRate > 30 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-orange-500" />
              )}
              <span className="text-muted-foreground">
                {trends.responseRate > 30 ? 'Above average' : 'Needs improvement'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conversion</span>
              <Badge variant={trends.conversionRate > 15 ? 'default' : 'secondary'}>
                {trends.conversionRate}%
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Target className="h-3 w-3 text-blue-500" />
              <span className="text-muted-foreground">
                {totalLeadsThisWeek} leads this week
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Leads Chart */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Daily New Leads (Last 7 Days)</h4>
          {hasEnoughData ? (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#leadsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-28 rounded bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
              Not enough data to render chart
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalLeadsThisWeek} total leads</span>
            <span className={`flex items-center gap-1 ${leadsChange >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {leadsChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(leadsChange).toFixed(1)}% vs early week
            </span>
          </div>
        </div>

        {/* Message Activity Chart */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Daily Messages (Last 7 Days)</h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                name="Sent"
              />
              <Line
                type="monotone"
                dataKey="received"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--secondary))' }}
                name="Received"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalMessagesThisWeek} messages sent this week</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Sent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span>Received</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};