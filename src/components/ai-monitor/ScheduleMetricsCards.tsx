
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, TrendingUp, Play, Pause, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleMetrics {
  totalScheduled: number;
  messagesToday: number;
  messagesThisWeek: number;
  avgResponseRate: number;
  activeSequences: number;
  pausedSequences: number;
}

interface ScheduleMetricsCardsProps {
  metrics: ScheduleMetrics;
  loading: boolean;
}

const ScheduleMetricsCards = ({ metrics, loading }: ScheduleMetricsCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getResponseRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseRateBadge = (rate: number) => {
    if (rate >= 70) return 'default';
    if (rate >= 50) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Total Scheduled */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalScheduled}</div>
          <p className="text-xs text-muted-foreground">
            Active sequences
          </p>
        </CardContent>
      </Card>

      {/* Due Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metrics.messagesToday}</div>
          <p className="text-xs text-muted-foreground">
            Messages to send
          </p>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{metrics.messagesThisWeek}</div>
          <p className="text-xs text-muted-foreground">
            Scheduled messages
          </p>
        </CardContent>
      </Card>

      {/* Response Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getResponseRateColor(metrics.avgResponseRate)}`}>
            {metrics.avgResponseRate}%
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <Badge variant={getResponseRateBadge(metrics.avgResponseRate)} className="text-xs">
              {metrics.avgResponseRate >= 70 ? 'Excellent' : 
               metrics.avgResponseRate >= 50 ? 'Good' : 'Needs Work'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Sequences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <Play className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.activeSequences}</div>
          <p className="text-xs text-muted-foreground">
            Running sequences
          </p>
        </CardContent>
      </Card>

      {/* Paused Sequences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paused</CardTitle>
          <Pause className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metrics.pausedSequences}</div>
          <p className="text-xs text-muted-foreground">
            Paused sequences
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleMetricsCards;
